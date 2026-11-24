package faults

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// ----------------------------------------------------------------
// Validate

func TestConfigValidate(t *testing.T) {
	tests := []struct {
		name    string
		cfg     Config
		wantErr bool
	}{
		{"zero value is valid", Config{}, false},
		{"typical config is valid", Config{DelayMs: 200, FailureProbability: 0.3, TimeoutMs: 1000}, false},
		{"upper bounds are valid", Config{DelayMs: 10000, FailureProbability: 1, TimeoutMs: 10000}, false},
		{"negative delay", Config{DelayMs: -1}, true},
		{"delay above max", Config{DelayMs: 10001}, true},
		{"negative probability", Config{FailureProbability: -0.1}, true},
		{"probability above 1", Config{FailureProbability: 1.1}, true},
		{"negative timeout", Config{TimeoutMs: -1}, true},
		{"timeout above max", Config{TimeoutMs: 10001}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cfg.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// ----------------------------------------------------------------
// ApplyDelay

func TestApplyDelay_ZeroReturnsImmediately(t *testing.T) {
	start := time.Now()
	if err := ApplyDelay(context.Background(), 0); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if elapsed := time.Since(start); elapsed > 20*time.Millisecond {
		t.Fatalf("zero delay took too long: %v", elapsed)
	}
}

func TestApplyDelay_WaitsApproximately(t *testing.T) {
	start := time.Now()
	if err := ApplyDelay(context.Background(), 100); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	elapsed := time.Since(start)

	if elapsed < 95*time.Millisecond {
		t.Fatalf("returned too early: %v", elapsed)
	}
	if elapsed > 300*time.Millisecond {
		t.Fatalf("took too long: %v", elapsed)
	}
}

func TestApplyDelay_CancelledContextInterrupts(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(20 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	err := ApplyDelay(ctx, 5000)
	elapsed := time.Since(start)

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("got error %v, want context.Canceled", err)
	}
	if elapsed > time.Second {
		t.Fatalf("delay was not interrupted, took %v", elapsed)
	}
}

// ----------------------------------------------------------------
// ShouldFail

func TestShouldFail_ZeroNeverFails(t *testing.T) {
	for i := 0; i < 1000; i++ {
		if ShouldFail(0) {
			t.Fatal("ShouldFail(0) returned true")
		}
	}
}

func TestShouldFail_OneAlwaysFails(t *testing.T) {
	for i := 0; i < 1000; i++ {
		if !ShouldFail(1) {
			t.Fatal("ShouldFail(1) returned false")
		}
	}
}

func TestShouldFail_IntermediateProducesMixture(t *testing.T) {
	const trials = 10000
	failures := 0
	for i := 0; i < trials; i++ {
		if ShouldFail(0.5) {
			failures++
		}
	}

	if failures == 0 || failures == trials {
		t.Fatalf("expected a mixture, got %d/%d failures", failures, trials)
	}
	// std dev is ~50 here, so this range is ~10 sigma wide: effectively never flaky
	if failures < 4500 || failures > 5500 {
		t.Fatalf("failure rate far from 0.5: %d/%d", failures, trials)
	}
}

// ----------------------------------------------------------------
// Middleware helpers

// trackingHandler records whether it ran and when.
type trackingHandler struct {
	called   bool
	calledAt time.Time
}

func (h *trackingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.called = true
	h.calledAt = time.Now()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"data":"real sandbox data"}`))
}

func serve(cfg Config, next http.Handler, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	Middleware(cfg)(next).ServeHTTP(rec, req)
	return rec
}

// ----------------------------------------------------------------
// Middleware

func TestMiddleware_CallsHandlerWhenNoFault(t *testing.T) {
	h := &trackingHandler{}
	rec := serve(Config{}, h, httptest.NewRequest(http.MethodGet, "/", nil))

	if !h.called {
		t.Fatal("handler was not called")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("got status %d, want 200", rec.Code)
	}
	if rec.Body.String() != `{"data":"real sandbox data"}` {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}
}

func TestMiddleware_DoesNotCallHandlerOnFailure(t *testing.T) {
	h := &trackingHandler{}
	rec := serve(Config{FailureProbability: 1}, h, httptest.NewRequest(http.MethodGet, "/", nil))

	if h.called {
		t.Fatal("handler was called despite injected failure")
	}
	if rec.Body.String() == `{"data":"real sandbox data"}` {
		t.Fatal("response contains regular sandbox data")
	}
}

func TestMiddleware_FailureResponseIsCorrect(t *testing.T) {
	h := &trackingHandler{}
	rec := serve(Config{FailureProbability: 1}, h, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got status %d, want 500", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("got Content-Type %q, want application/json", ct)
	}

	var body errorResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("response is not valid JSON: %v", err)
	}
	if body.Error != "chaos_failure" {
		t.Fatalf("got error %q, want chaos_failure", body.Error)
	}
	if body.Message != "Artificial failure injected by Mini ChaosLab" {
		t.Fatalf("unexpected message: %q", body.Message)
	}
}

func TestMiddleware_DelayHappensBeforeHandler(t *testing.T) {
	const delay = 80 * time.Millisecond
	h := &trackingHandler{}

	start := time.Now()
	serve(Config{DelayMs: int(delay / time.Millisecond)}, h, httptest.NewRequest(http.MethodGet, "/", nil))

	if !h.called {
		t.Fatal("handler was not called")
	}
	if waited := h.calledAt.Sub(start); waited < delay-5*time.Millisecond {
		t.Fatalf("handler ran after only %v, want at least ~%v", waited, delay)
	}
}

func TestMiddleware_CancelledDuringDelayStopsEverything(t *testing.T) {
	h := &trackingHandler{}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	req := httptest.NewRequest(http.MethodGet, "/", nil).WithContext(ctx)

	rec := serve(Config{DelayMs: 5000, FailureProbability: 1}, h, req)

	if h.called {
		t.Fatal("handler was called after cancellation")
	}
	if rec.Body.Len() != 0 {
		t.Fatalf("expected empty body, got %q", rec.Body.String())
	}
}

func TestMiddleware_CombinedFaults(t *testing.T) {
	const delay = 60 * time.Millisecond
	h := &trackingHandler{}

	start := time.Now()
	rec := serve(
		Config{DelayMs: int(delay / time.Millisecond), FailureProbability: 1},
		h,
		httptest.NewRequest(http.MethodGet, "/", nil),
	)
	elapsed := time.Since(start)

	if elapsed < delay-5*time.Millisecond {
		t.Fatalf("delay not applied before failure: took %v", elapsed)
	}
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("got status %d, want 500", rec.Code)
	}
	if h.called {
		t.Fatal("handler was called despite injected failure")
	}
}

func TestMiddlewareQueryOverridesDefaults(t *testing.T) {
	// defaults would fail every request
	h := Middleware(Config{FailureProbability: 1})(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// no params: falls back to the defaults, so it fails
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/x", nil))
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("no params: got %d, want 500", rec.Code)
	}

	// explicit zero overrides the default
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/x?failure_probability=0&delay_ms=0", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("override to 0: got %d, want 200", rec.Code)
	}

	// invalid value is rejected
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/x?failure_probability=5", nil))
	if rec.Code != http.StatusBadRequest {
		t.Errorf("invalid param: got %d, want 400", rec.Code)
	}
}
