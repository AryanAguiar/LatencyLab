package loadtest

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"runtime"
	"sync/atomic"
	"testing"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/faults"
)

func newServer(t *testing.T, h http.HandlerFunc) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/sandbox/api/products", h)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func okHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

func cfg(requests, concurrency int) ExperimentConfig {
	return ExperimentConfig{
		Name:           "test",
		TargetEndpoint: "products",
		Requests:       requests,
		Concurrency:    concurrency,
		Faults:         faults.Config{TimeoutMs: 2000},
	}
}

// Test 1
func TestBasicExecution(t *testing.T) {
	srv := newServer(t, okHandler)

	res, err := Run(context.Background(), cfg(10, 3), srv.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Results) != 10 {
		t.Fatalf("got %d results, want 10", len(res.Results))
	}

	seen := make(map[int]bool)
	for _, r := range res.Results {
		if seen[r.RequestID] {
			t.Errorf("duplicate request ID %d", r.RequestID)
		}
		seen[r.RequestID] = true
		if !r.Success {
			t.Errorf("request %d failed: %s", r.RequestID, r.Error)
		}
	}
}

// Test 2
func TestConcurrencyLimit(t *testing.T) {
	var active, maxActive atomic.Int32

	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		cur := active.Add(1)
		defer active.Add(-1)

		for {
			old := maxActive.Load()
			if cur <= old || maxActive.CompareAndSwap(old, cur) {
				break
			}
		}

		time.Sleep(30 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})

	if _, err := Run(context.Background(), cfg(20, 5), srv.URL); err != nil {
		t.Fatal(err)
	}

	got := maxActive.Load()
	if got > 5 {
		t.Fatalf("max active = %d, want <= 5", got)
	}
	if got < 2 {
		t.Fatalf("max active = %d, requests never overlapped, test proves nothing", got)
	}
}

// Test 3
func TestRequestAccounting(t *testing.T) {
	var hits atomic.Int32
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusOK)
	})

	res, err := Run(context.Background(), cfg(100, 10), srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if hits.Load() != 100 {
		t.Errorf("server saw %d requests, want 100", hits.Load())
	}
	if len(res.Results) != 100 {
		t.Errorf("got %d results, want 100", len(res.Results))
	}

	ids := make(map[int]bool)
	for _, r := range res.Results {
		ids[r.RequestID] = true
	}
	for id := 1; id <= 100; id++ {
		if !ids[id] {
			t.Errorf("no result for job %d", id)
		}
	}
}

// Test 4
func TestHTTPFailures(t *testing.T) {
	var n atomic.Int32
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		if n.Add(1)%3 == 0 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	res, err := Run(context.Background(), cfg(30, 4), srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Results) != 30 {
		t.Fatalf("got %d results, want 30", len(res.Results))
	}

	failures := 0
	for _, r := range res.Results {
		switch r.StatusCode {
		case 500:
			failures++
			if r.Success || r.Error == "" {
				t.Errorf("500 result should be unsuccessful with an error: %+v", r)
			}
		case 200:
			if !r.Success {
				t.Errorf("200 result should be successful: %+v", r)
			}
		default:
			t.Errorf("unexpected status %d", r.StatusCode)
		}
	}
	if failures != 10 {
		t.Errorf("got %d failures, want 10", failures)
	}
}

// Test 5
func TestTimeout(t *testing.T) {
	var n atomic.Int32
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		if n.Add(1)%2 == 0 {
			select {
			case <-time.After(500 * time.Millisecond):
			case <-r.Context().Done():
				return
			}
		}
		w.WriteHeader(http.StatusOK)
	})

	c := cfg(10, 2)
	c.Faults.TimeoutMs = 50

	res, err := Run(context.Background(), c, srv.URL)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Results) != 10 {
		t.Fatalf("got %d results, want 10", len(res.Results))
	}

	var timedOut, succeeded int
	for _, r := range res.Results {
		if r.Success {
			succeeded++
			continue
		}
		timedOut++
		if r.StatusCode != 0 || r.Error == "" {
			t.Errorf("timeout result should have status 0 and an error: %+v", r)
		}
	}
	if timedOut != 5 || succeeded != 5 {
		t.Errorf("timedOut=%d succeeded=%d, want 5 and 5 (workers must keep going after a timeout)", timedOut, succeeded)
	}
}

// Test 6
func TestCancellation(t *testing.T) {
	before := runtime.NumGoroutine()

	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(200 * time.Millisecond):
			w.WriteHeader(http.StatusOK)
		case <-r.Context().Done():
		}
	})

	ctx, cancel := context.WithCancel(context.Background())
	time.AfterFunc(500*time.Millisecond, cancel)

	start := time.Now()
	res, err := Run(ctx, cfg(100, 5), srv.URL)
	elapsed := time.Since(start)

	if !errors.Is(err, context.Canceled) {
		t.Errorf("err = %v, want context.Canceled", err)
	}
	if elapsed > 2*time.Second {
		t.Errorf("took %v to stop, cancellation isn't working", elapsed)
	}
	if len(res.Results) == 0 || len(res.Results) >= 100 {
		t.Errorf("got %d results, want some but not all", len(res.Results))
	}

	srv.Close()
	deadline := time.Now().Add(2 * time.Second)
	for runtime.NumGoroutine() > before && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	if after := runtime.NumGoroutine(); after > before {
		t.Errorf("goroutines: before=%d after=%d, possible leak", before, after)
	}
}

// Test 7
func TestInvalidConfig(t *testing.T) {
	var hits atomic.Int32
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusOK)
	})

	tests := []struct {
		name string
		cfg  ExperimentConfig
	}{
		{"zero requests", cfg(0, 3)},
		{"zero concurrency", cfg(10, 0)},
		{"too much concurrency", cfg(10, MaxConcurrency+1)},
		{"too many requests", cfg(MaxRequests+1, 3)},
		{"unknown endpoint", ExperimentConfig{TargetEndpoint: "https://evil.com", Requests: 1, Concurrency: 1}},
		{"bad faults", ExperimentConfig{TargetEndpoint: "products", Requests: 1, Concurrency: 1, Faults: faults.Config{FailureProbability: 2}}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			res, err := Run(context.Background(), tc.cfg, srv.URL)
			if err == nil {
				t.Fatal("expected an error")
			}
			if len(res.Results) != 0 {
				t.Errorf("got %d results, want 0", len(res.Results))
			}
		})
	}

	if hits.Load() != 0 {
		t.Errorf("server received %d requests, want 0", hits.Load())
	}
}

// Test 8
func TestFaultsForwardedAsQuery(t *testing.T) {
	seen := make(chan url.Values, 1)
	srv := newServer(t, func(w http.ResponseWriter, r *http.Request) {
		select {
		case seen <- r.URL.Query():
		default:
		}
		w.WriteHeader(http.StatusOK)
	})

	c := cfg(1, 1)
	c.Faults = faults.Config{DelayMs: 0, FailureProbability: 0.25, TimeoutMs: 2000}

	if _, err := Run(context.Background(), c, srv.URL); err != nil {
		t.Fatal(err)
	}

	q := <-seen
	if q.Get("delay_ms") != "0" || q.Get("failure_probability") != "0.25" {
		t.Errorf("faults not forwarded, got query %v", q)
	}
}
