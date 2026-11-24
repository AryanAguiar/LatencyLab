package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/loadtest"
	"github.com/AryanAguiar/LatencyLab/backend/internal/metrics"
)

type createTargetRequest struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

func createTargetHandler(w http.ResponseWriter, r *http.Request) {
	var req createTargetRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error(), nil)
		return
	}
	if errs := req.validate(); len(errs) > 0 {
		writeError(w, http.StatusUnprocessableEntity, "validation failed", errs)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":   "tgt_1", // placeholder
		"name": req.Name,
		"url":  req.URL,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (r createTargetRequest) validate() map[string]string {
	errs := map[string]string{}
	if strings.TrimSpace(r.Name) == "" {
		errs["name"] = "is required"
	}
	if !strings.HasPrefix(r.URL, "http://") && !strings.HasPrefix(r.URL, "https://") {
		errs["url"] = "must start with http:// or https://"
	}
	return errs
}

type experimentResponse struct {
	Status     string                    `json:"status"`
	StartedAt  time.Time                 `json:"startedAt"`
	DurationMs int64                     `json:"durationMs"`
	Config     loadtest.ExperimentConfig `json:"config"`
	Metrics    metrics.ExperimentMetrics `json:"metrics"`
	Results    []loadtest.RequestResult  `json:"results"`
}

const maxExperimentTime = 25 * time.Second

var experimentSlots = make(chan struct{}, 2) // max 2 experiments at once

func runExperimentHandler(baseURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var cfg loadtest.ExperimentConfig

		if err := decodeJSON(w, r, &cfg); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error(), nil)
			return
		}
		if err := cfg.Validate(); err != nil {
			writeError(w, http.StatusUnprocessableEntity, err.Error(), nil)
			return
		}

		select {
		case experimentSlots <- struct{}{}:
			defer func() { <-experimentSlots }()
		default:
			writeError(w, http.StatusTooManyRequests, "too many experiments running, try again shortly", nil)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), maxExperimentTime)
		defer cancel()

		start := time.Now()
		result, err := loadtest.Run(ctx, cfg, baseURL)
		elapsed := time.Since(start)

		if err != nil {
			switch {
			case r.Context().Err() != nil:
				return // client disconnected, nobody to answer
			case errors.Is(ctx.Err(), context.DeadlineExceeded):
				writeError(w, http.StatusGatewayTimeout, "experiment exceeded time limit", nil)
			default:
				writeError(w, http.StatusInternalServerError, "experiment failed: "+err.Error(), nil)
			}
			return
		}

		writeJSON(w, http.StatusOK, experimentResponse{
			Status:     "completed",
			StartedAt:  start,
			DurationMs: elapsed.Milliseconds(),
			Config:     cfg,
			Metrics:    metrics.Calculate(result.Results, elapsed),
			Results:    result.Results,
		})
	}
}
