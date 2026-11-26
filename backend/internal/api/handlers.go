package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/loadtest"
	"github.com/AryanAguiar/LatencyLab/backend/internal/metrics"
	"github.com/AryanAguiar/LatencyLab/backend/internal/storage"
	"github.com/go-chi/chi/v5"
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
	ID          string                    `json:"id,omitempty"`
	Status      string                    `json:"status"`
	StartedAt   time.Time                 `json:"startedAt"`
	CompletedAt time.Time                 `json:"completedAt,omitempty"`
	CreatedAt   time.Time                 `json:"createdAt,omitempty"`
	DurationMs  int64                     `json:"durationMs"`
	Config      loadtest.ExperimentConfig `json:"config"`
	Metrics     metrics.ExperimentMetrics `json:"metrics"`
	Results     []loadtest.RequestResult  `json:"results"`
}

const maxExperimentTime = 5 * time.Minute
const defaultExperimentTime = 25 * time.Second
const experimentTimeMargin = 10 * time.Second
const statusPersistenceTimeout = 5 * time.Second

var experimentSlots = make(chan struct{}, 2) // max 2 experiments at once

type ExperimentRepository interface {
	CreateExperiment(context.Context, storage.CreateExperimentParams) (storage.Experiment, error)
	UpdateStatus(context.Context, string, string) error
	CompleteExperiment(context.Context, string, json.RawMessage, json.RawMessage) (time.Time, error)
	GetExperiment(context.Context, string) (storage.Experiment, error)
	ListExperiments(context.Context, int, int) ([]storage.ExperimentSummary, error)
}

func runExperimentHandler(baseURL string) http.HandlerFunc {
	return runExperimentHandlerWithRepository(baseURL, nil)
}

func runExperimentHandlerWithRepository(baseURL string, repository ExperimentRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var cfg loadtest.ExperimentConfig

		if err := decodeJSON(w, r, &cfg); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error(), nil)
			return
		}
		if cfg.ExperimentType == "" {
			cfg.ExperimentType = "chaos"
		}
		if cfg.ExperimentType == "baseline" {
			cfg.Faults.DelayMs = 0
			cfg.Faults.FailureProbability = 0
		}
		if err := cfg.ValidateForExtendedDuration(); err != nil {
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

		var experiment storage.Experiment
		if repository != nil {
			configuration, err := json.Marshal(cfg)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not encode experiment configuration", nil)
				return
			}
			experiment, err = repository.CreateExperiment(r.Context(), storage.CreateExperimentParams{
				ExperimentType: cfg.ExperimentType,
				TargetEndpoint: cfg.TargetEndpoint,
				Configuration:  configuration,
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not create experiment: "+err.Error(), nil)
				return
			}
		}

		ctx, cancel := context.WithTimeout(r.Context(), experimentTimeout(cfg))
		defer cancel()

		start := time.Now()
		if experiment.StartedAt != nil {
			start = *experiment.StartedAt
		}
		result, err := loadtest.RunWithExtendedDuration(ctx, cfg, baseURL)
		elapsed := time.Since(start)

		if err != nil {
			status := storage.StatusFailed
			if errors.Is(r.Context().Err(), context.Canceled) {
				status = storage.StatusCancelled
			}
			if repository != nil {
				markExperimentStatus(repository, experiment.ID, status)
			}
			switch {
			case r.Context().Err() != nil:
				return // client disconnected, nobody to answer
			case errors.Is(ctx.Err(), context.DeadlineExceeded):
				writeError(w, http.StatusGatewayTimeout, "experiment exceeded time limit", nil)
			default:
				message := "experiment failed: " + err.Error()
				if repository != nil {
					message = fmt.Sprintf("%s (experiment %s)", message, experiment.ID)
				}
				writeError(w, http.StatusInternalServerError, message, nil)
			}
			return
		}

		completedAt := time.Now()
		calculatedMetrics := metrics.Calculate(result.Results, elapsed)
		if repository != nil {
			rawResults, marshalErr := json.Marshal(result.Results)
			if marshalErr != nil {
				markExperimentStatus(repository, experiment.ID, storage.StatusFailed)
				writeError(w, http.StatusInternalServerError, "could not encode experiment results", nil)
				return
			}
			rawMetrics, marshalErr := json.Marshal(calculatedMetrics)
			if marshalErr != nil {
				markExperimentStatus(repository, experiment.ID, storage.StatusFailed)
				writeError(w, http.StatusInternalServerError, "could not encode experiment metrics", nil)
				return
			}
			completedAt, err = repository.CompleteExperiment(r.Context(), experiment.ID, rawResults, rawMetrics)
			if err != nil {
				status := storage.StatusFailed
				if errors.Is(r.Context().Err(), context.Canceled) {
					status = storage.StatusCancelled
				}
				markExperimentStatus(repository, experiment.ID, status)
				log.Printf("could not persist results for experiment %s: %v", experiment.ID, err)
				writeError(w, http.StatusInternalServerError, "experiment ran but results could not be saved: "+err.Error(), nil)
				return
			}
		}

		writeJSON(w, http.StatusOK, experimentResponse{
			ID:          experiment.ID,
			Status:      "completed",
			StartedAt:   start,
			CompletedAt: completedAt,
			CreatedAt:   experiment.CreatedAt,
			DurationMs:  elapsed.Milliseconds(),
			Config:      cfg,
			Metrics:     calculatedMetrics,
			Results:     result.Results,
		})
	}
}

func experimentTimeout(cfg loadtest.ExperimentConfig) time.Duration {
	timeout := cfg.EstimatedDuration() + experimentTimeMargin
	if timeout < defaultExperimentTime {
		timeout = defaultExperimentTime
	}
	if timeout > maxExperimentTime {
		timeout = maxExperimentTime
	}
	return timeout
}

func markExperimentStatus(repository ExperimentRepository, experimentID, status string) {
	ctx, cancel := context.WithTimeout(context.Background(), statusPersistenceTimeout)
	defer cancel()
	if err := repository.UpdateStatus(ctx, experimentID, status); err != nil {
		log.Printf("could not persist %s status for experiment %s: %v", status, experimentID, err)
	}
}

type experimentListItem struct {
	ID             string          `json:"id"`
	Status         string          `json:"status"`
	ExperimentType string          `json:"experiment_type"`
	TargetEndpoint string          `json:"target_endpoint"`
	Metrics        json.RawMessage `json:"metrics"`
	StartedAt      *time.Time      `json:"started_at"`
	CompletedAt    *time.Time      `json:"completed_at"`
	CreatedAt      time.Time       `json:"created_at"`
}

func listExperimentsHandler(repository ExperimentRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, err := queryInt(r, "limit", 20)
		if err != nil || limit < 1 || limit > 100 {
			writeError(w, http.StatusBadRequest, "limit must be an integer between 1 and 100", nil)
			return
		}
		offset, err := queryInt(r, "offset", 0)
		if err != nil || offset < 0 {
			writeError(w, http.StatusBadRequest, "offset must be a non-negative integer", nil)
			return
		}

		experiments, err := repository.ListExperiments(r.Context(), limit, offset)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not retrieve experiment history: "+err.Error(), nil)
			return
		}
		items := make([]experimentListItem, 0, len(experiments))
		for _, experiment := range experiments {
			items = append(items, experimentListItem{
				ID:             experiment.ID,
				Status:         strings.ToLower(experiment.Status),
				ExperimentType: experiment.ExperimentType,
				TargetEndpoint: experiment.TargetEndpoint,
				Metrics:        experiment.Metrics,
				StartedAt:      experiment.StartedAt,
				CompletedAt:    experiment.CompletedAt,
				CreatedAt:      experiment.CreatedAt,
			})
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"experiments": items,
			"limit":       limit,
			"offset":      offset,
		})
	}
}

type experimentDetailResponse struct {
	ID             string          `json:"id"`
	Status         string          `json:"status"`
	ExperimentType string          `json:"experiment_type"`
	TargetEndpoint string          `json:"target_endpoint"`
	Configuration  json.RawMessage `json:"configuration"`
	Results        json.RawMessage `json:"results"`
	Metrics        json.RawMessage `json:"metrics"`
	StartedAt      *time.Time      `json:"started_at"`
	CompletedAt    *time.Time      `json:"completed_at"`
	CreatedAt      time.Time       `json:"created_at"`
}

func getExperimentHandler(repository ExperimentRepository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		if !isUUID(id) {
			writeError(w, http.StatusBadRequest, "experiment ID must be a valid UUID", nil)
			return
		}

		experiment, err := repository.GetExperiment(r.Context(), id)
		if errors.Is(err, storage.ErrExperimentNotFound) {
			writeError(w, http.StatusNotFound, "experiment not found", nil)
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not retrieve experiment: "+err.Error(), nil)
			return
		}
		writeJSON(w, http.StatusOK, experimentDetailResponse{
			ID:             experiment.ID,
			Status:         strings.ToLower(experiment.Status),
			ExperimentType: experiment.ExperimentType,
			TargetEndpoint: experiment.TargetEndpoint,
			Configuration:  experiment.Configuration,
			Results:        experiment.Results,
			Metrics:        experiment.Metrics,
			StartedAt:      experiment.StartedAt,
			CompletedAt:    experiment.CompletedAt,
			CreatedAt:      experiment.CreatedAt,
		})
	}
}

func queryInt(r *http.Request, key string, fallback int) (int, error) {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback, nil
	}
	return strconv.Atoi(value)
}

func isUUID(value string) bool {
	if len(value) != 36 {
		return false
	}
	for i, character := range value {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if character != '-' {
				return false
			}
			continue
		}
		if !((character >= '0' && character <= '9') ||
			(character >= 'a' && character <= 'f') ||
			(character >= 'A' && character <= 'F')) {
			return false
		}
	}
	return true
}
