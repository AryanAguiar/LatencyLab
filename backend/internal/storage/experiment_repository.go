package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	StatusRunning   = "RUNNING"
	StatusCompleted = "COMPLETED"
	StatusFailed    = "FAILED"
	StatusCancelled = "CANCELLED"
)

var ErrExperimentNotFound = errors.New("experiment not found")

type CreateExperimentParams struct {
	ExperimentType string
	TargetEndpoint string
	Configuration  json.RawMessage
}

type Experiment struct {
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

type ExperimentSummary struct {
	ID             string          `json:"id"`
	Status         string          `json:"status"`
	ExperimentType string          `json:"experiment_type"`
	TargetEndpoint string          `json:"target_endpoint"`
	Metrics        json.RawMessage `json:"metrics"`
	StartedAt      *time.Time      `json:"started_at"`
	CompletedAt    *time.Time      `json:"completed_at"`
	CreatedAt      time.Time       `json:"created_at"`
}

type ExperimentRepository struct {
	pool *pgxpool.Pool
}

func NewExperimentRepository(pool *pgxpool.Pool) *ExperimentRepository {
	return &ExperimentRepository{pool: pool}
}

func (r *ExperimentRepository) CreateExperiment(
	ctx context.Context,
	params CreateExperimentParams,
) (Experiment, error) {
	if !json.Valid(params.Configuration) {
		return Experiment{}, errors.New("experiment configuration must be valid JSON")
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO experiments (
			status, experiment_type, target_endpoint, configuration, started_at
		)
		VALUES ($1, $2, $3, $4::jsonb, now())
		RETURNING id::text, status, experiment_type, target_endpoint, configuration,
		          raw_results, metrics, started_at, completed_at, created_at
	`, StatusRunning, params.ExperimentType, params.TargetEndpoint, string(params.Configuration))
	experiment, err := scanExperiment(row)
	if err != nil {
		return Experiment{}, fmt.Errorf("create experiment record: %w", err)
	}
	return experiment, nil
}

func (r *ExperimentRepository) UpdateStatus(ctx context.Context, id, status string) error {
	if status != StatusRunning && status != StatusCompleted &&
		status != StatusFailed && status != StatusCancelled {
		return fmt.Errorf("unsupported experiment status %q", status)
	}

	tag, err := r.pool.Exec(ctx, `
		UPDATE experiments
		SET status = $2,
		    completed_at = CASE
		        WHEN $2 IN ('COMPLETED', 'FAILED', 'CANCELLED') THEN now()
		        ELSE NULL
		    END
		WHERE id = $1::uuid
	`, id, status)
	if err != nil {
		return fmt.Errorf("update experiment status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrExperimentNotFound
	}
	return nil
}

func (r *ExperimentRepository) CompleteExperiment(
	ctx context.Context,
	id string,
	results json.RawMessage,
	metrics json.RawMessage,
) (time.Time, error) {
	if !json.Valid(results) || !json.Valid(metrics) {
		return time.Time{}, errors.New("experiment results and metrics must be valid JSON")
	}

	var completedAt time.Time
	err := r.pool.QueryRow(ctx, `
		UPDATE experiments
		SET raw_results = $2::jsonb,
		    metrics = $3::jsonb,
		    status = 'COMPLETED',
		    completed_at = now()
		WHERE id = $1::uuid
		RETURNING completed_at
	`, id, string(results), string(metrics)).Scan(&completedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return time.Time{}, ErrExperimentNotFound
	}
	if err != nil {
		return time.Time{}, fmt.Errorf("save experiment results and metrics: %w", err)
	}
	return completedAt, nil
}

func (r *ExperimentRepository) GetExperiment(ctx context.Context, id string) (Experiment, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id::text, status, experiment_type, target_endpoint, configuration,
		       raw_results, metrics, started_at, completed_at, created_at
		FROM experiments
		WHERE id = $1::uuid
	`, id)
	experiment, err := scanExperiment(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Experiment{}, ErrExperimentNotFound
	}
	if err != nil {
		return Experiment{}, fmt.Errorf("get experiment: %w", err)
	}
	return experiment, nil
}

func (r *ExperimentRepository) ListExperiments(
	ctx context.Context,
	limit, offset int,
) ([]ExperimentSummary, error) {
	if limit < 1 || limit > 100 {
		return nil, errors.New("limit must be between 1 and 100")
	}
	if offset < 0 {
		return nil, errors.New("offset cannot be negative")
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id::text, status, experiment_type, target_endpoint, metrics,
		       started_at, completed_at, created_at
		FROM experiments
		ORDER BY created_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list experiments: %w", err)
	}
	defer rows.Close()

	experiments := make([]ExperimentSummary, 0)
	for rows.Next() {
		var experiment ExperimentSummary
		var metrics []byte
		if err := rows.Scan(
			&experiment.ID,
			&experiment.Status,
			&experiment.ExperimentType,
			&experiment.TargetEndpoint,
			&metrics,
			&experiment.StartedAt,
			&experiment.CompletedAt,
			&experiment.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan experiment history row: %w", err)
		}
		experiment.Metrics = json.RawMessage(metrics)
		experiments = append(experiments, experiment)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read experiment history: %w", err)
	}
	return experiments, nil
}

func scanExperiment(row pgx.Row) (Experiment, error) {
	var experiment Experiment
	var configuration, results, metrics []byte
	err := row.Scan(
		&experiment.ID,
		&experiment.Status,
		&experiment.ExperimentType,
		&experiment.TargetEndpoint,
		&configuration,
		&results,
		&metrics,
		&experiment.StartedAt,
		&experiment.CompletedAt,
		&experiment.CreatedAt,
	)
	if err != nil {
		return Experiment{}, err
	}
	experiment.Configuration = json.RawMessage(configuration)
	experiment.Results = json.RawMessage(results)
	experiment.Metrics = json.RawMessage(metrics)
	return experiment, nil
}
