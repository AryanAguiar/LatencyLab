package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const validBody = `{
  "name": "t",
  "target_endpoint": "products",
  "requests": 3,
  "concurrency": 1,
  "faults": {"delay_ms": 0, "failure_probability": 0, "timeout_ms": 2000}
}`

func post(h http.HandlerFunc, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/experiments/run", strings.NewReader(body))
	rec := httptest.NewRecorder()
	h(rec, req)
	return rec
}

func TestRunExperiment_HappyPath(t *testing.T) {
	sandbox := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer sandbox.Close()

	rec := post(runExperimentHandler(sandbox.URL), validBody)
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d, want 200: %s", rec.Code, rec.Body)
	}

	var resp experimentResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.Status != "completed" || resp.Metrics.TotalRequests != 3 || len(resp.Results) != 3 {
		t.Errorf("unexpected response: %+v", resp)
	}
}

func TestRunExperiment_ErrorPaths(t *testing.T) {
	tests := []struct {
		name string
		body string
		want int
	}{
		{"malformed json", `{ nope`, http.StatusBadRequest},
		{"unknown field", `{"name":"t","bogus":1}`, http.StatusBadRequest},
		{"two json objects", validBody + validBody, http.StatusBadRequest},
		{"empty object", `{}`, http.StatusUnprocessableEntity},
		{"zero requests", strings.Replace(validBody, `"requests": 3`, `"requests": 0`, 1), http.StatusUnprocessableEntity},
		{"too much concurrency", strings.Replace(validBody, `"concurrency": 1`, `"concurrency": 11`, 1), http.StatusUnprocessableEntity},
		{"unknown endpoint", strings.Replace(validBody, `"products"`, `"https://evil.com"`, 1), http.StatusUnprocessableEntity},
	}

	h := runExperimentHandler("http://unused")
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if rec := post(h, tc.body); rec.Code != tc.want {
				t.Errorf("got %d, want %d: %s", rec.Code, tc.want, rec.Body)
			}
		})
	}
}

func TestRunExperiment_TooManyConcurrent(t *testing.T) {
	// fill every slot, then a valid request should bounce
	for i := 0; i < cap(experimentSlots); i++ {
		experimentSlots <- struct{}{}
	}
	defer func() {
		for i := 0; i < cap(experimentSlots); i++ {
			<-experimentSlots
		}
	}()

	rec := post(runExperimentHandler("http://unused"), validBody)
	if rec.Code != http.StatusTooManyRequests {
		t.Errorf("got %d, want 429", rec.Code)
	}
}
