package faults

import (
	"context"
	"encoding/json"
	"errors"
	"math/rand/v2"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

type Config struct {
	DelayMs            int     `json:"delay_ms"`
	FailureProbability float64 `json:"failure_probability"`
	TimeoutMs          int     `json:"timeout_ms"`
}

type errorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Middleware(base Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cfg, err := override(base, r)
			if err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{
					Error:   "invalid_fault_params",
					Message: err.Error(),
				})
				return
			}

			if err := ApplyDelay(r.Context(), cfg.DelayMs); err != nil {
				return
			}

			if ShouldFail(cfg.FailureProbability) {
				writeJSON(w, http.StatusInternalServerError, errorResponse{
					Error:   "chaos_failure",
					Message: "Artificial failure injected by Mini ChaosLab",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ----------------------------------------
// helpers

func (c Config) Validate() error {
	if c.DelayMs < 0 || c.DelayMs > 10000 {
		return errors.New("delay must be between 0 and 10000 ms")
	}

	if c.FailureProbability < 0 || c.FailureProbability > 1 {
		return errors.New("failure probability must be between 0 and 1")
	}

	if c.TimeoutMs < 0 || c.TimeoutMs > 10000 {
		return errors.New("timeout must be between 0 and 10000 ms")
	}

	return nil
}

func ApplyDelay(ctx context.Context, delayMs int) error {
	if delayMs <= 0 {
		return nil
	}

	timer := time.NewTimer(time.Duration(delayMs) * time.Millisecond)
	defer timer.Stop()

	select {
	case <-timer.C:
		return nil

	case <-ctx.Done():
		return ctx.Err()
	}
}

func ShouldFail(probability float64) bool {
	if probability <= 0 {
		return false
	}

	if probability >= 1 {
		return true
	}

	return rand.Float64() < probability
}

// timeout_ms is not included: it is the client's timeout, not a server fault.
func (c Config) Query() url.Values {
	q := url.Values{}
	q.Set("delay_ms", strconv.Itoa(c.DelayMs))
	q.Set("failure_probability", strconv.FormatFloat(c.FailureProbability, 'f', -1, 64))
	return q
}

// override applies fault query params on top of base. Params that are
// absent keep the base value, so an explicit 0 still counts.
func override(base Config, r *http.Request) (Config, error) {
	q := r.URL.Query()
	cfg := base

	if q.Has("delay_ms") {
		v, err := strconv.Atoi(q.Get("delay_ms"))
		if err != nil {
			return base, errors.New("delay_ms must be an integer")
		}
		cfg.DelayMs = v
	}

	if q.Has("failure_probability") {
		v, err := strconv.ParseFloat(q.Get("failure_probability"), 64)
		if err != nil {
			return base, errors.New("failure_probability must be a number")
		}
		cfg.FailureProbability = v
	}

	if err := cfg.Validate(); err != nil {
		return base, err
	}
	return cfg, nil
}
