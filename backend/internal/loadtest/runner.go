package loadtest

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"time"
)

const (
	MaxRequests    = 100
	MaxConcurrency = 10
)

var endpoints = map[string]string{
	"products": "/sandbox/api/products",
	"users":    "/sandbox/api/users",
	"orders":   "/sandbox/api/orders",
}

type ExperimentResult struct {
	Config  ExperimentConfig `json:"config"`
	Results []RequestResult  `json:"results"`
}

const MaxEstimatedDuration = 20 * time.Second

func (c ExperimentConfig) EstimatedDuration() time.Duration {
	perRequest := time.Duration(c.Faults.DelayMs) * time.Millisecond
	if c.Faults.TimeoutMs > 0 {
		if t := time.Duration(c.Faults.TimeoutMs) * time.Millisecond; t < perRequest {
			perRequest = t
		}
	}
	rounds := (c.Requests + c.Concurrency - 1) / c.Concurrency
	return time.Duration(rounds) * perRequest
}

func (c ExperimentConfig) Validate() error {
	return c.validate(true)
}

// ValidateForExtendedDuration keeps configuration limits but makes the recommended duration advisory.
func (c ExperimentConfig) ValidateForExtendedDuration() error {
	return c.validate(false)
}

func (c ExperimentConfig) validate(enforceRecommendedDuration bool) error {
	if c.ExperimentType != "" && c.ExperimentType != "baseline" && c.ExperimentType != "chaos" {
		return fmt.Errorf("experiment_type must be baseline or chaos")
	}
	if _, ok := endpoints[c.TargetEndpoint]; !ok {
		return fmt.Errorf("unknown target endpoint %q", c.TargetEndpoint)
	}
	if c.Requests < 1 || c.Requests > MaxRequests {
		return fmt.Errorf("requests must be between 1 and %d", MaxRequests)
	}
	if c.Concurrency < 1 || c.Concurrency > MaxConcurrency {
		return fmt.Errorf("concurrency must be between 1 and %d", MaxConcurrency)
	}
	if err := c.Faults.Validate(); err != nil {
		return err
	}
	if est := c.EstimatedDuration(); enforceRecommendedDuration && est > MaxEstimatedDuration {
		return fmt.Errorf(
			"this config would take about %s, max is %s: lower requests or delay, or raise concurrency",
			est.Round(time.Second), MaxEstimatedDuration,
		)
	}
	return nil
}

func Run(ctx context.Context, cfg ExperimentConfig, baseURL string) (ExperimentResult, error) {
	return run(ctx, cfg, baseURL, true)
}

// RunWithExtendedDuration is used when the caller has warned the user about a long run.
func RunWithExtendedDuration(ctx context.Context, cfg ExperimentConfig, baseURL string) (ExperimentResult, error) {
	return run(ctx, cfg, baseURL, false)
}

func run(ctx context.Context, cfg ExperimentConfig, baseURL string, enforceRecommendedDuration bool) (ExperimentResult, error) {
	var err error
	if enforceRecommendedDuration {
		err = cfg.Validate()
	} else {
		err = cfg.ValidateForExtendedDuration()
	}
	if err != nil {
		return ExperimentResult{}, err
	}

	parent := ctx
	ctx, cancel := context.WithCancel(parent)
	defer cancel()

	targetURL := baseURL + endpoints[cfg.TargetEndpoint] + "?" + cfg.Faults.Query().Encode()
	client := &http.Client{
		Timeout: time.Duration(cfg.Faults.TimeoutMs) * time.Millisecond,
	}

	jobs := make(chan RequestJob)
	results := make(chan RequestResult)

	var wg sync.WaitGroup
	for i := 0; i < cfg.Concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			worker(ctx, jobs, results, client, targetURL)
		}()
	}

	go func() {
		defer close(jobs)
		for id := 1; id <= cfg.Requests; id++ {
			select {
			case jobs <- RequestJob{ID: id}:
			case <-ctx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	collected := make([]RequestResult, 0, cfg.Requests)
	for r := range results {
		collected = append(collected, r)
	}
	sort.Slice(collected, func(i, j int) bool {
		return collected[i].RequestID < collected[j].RequestID
	})

	return ExperimentResult{Config: cfg, Results: collected}, parent.Err()
}
