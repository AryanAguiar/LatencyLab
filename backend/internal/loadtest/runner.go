package loadtest

import (
	"context"
	"errors"
	"fmt"
	"net/http"
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

func (c ExperimentConfig) Validate() error {
	if _, ok := endpoints[c.TargetEndpoint]; !ok {
		return fmt.Errorf("unknown target endpoint %q", c.TargetEndpoint)
	}
	if c.Requests < 1 || c.Requests > MaxRequests {
		return fmt.Errorf("requests must be between 1 and %d", MaxRequests)
	}
	if c.Concurrency < 1 || c.Concurrency > MaxConcurrency {
		return fmt.Errorf("concurrency must be between 1 and %d", MaxConcurrency)
	}
	return c.Faults.Validate()
}

func Run(ctx context.Context, cfg ExperimentConfig, baseURL string) (ExperimentResult, error) {
	if err := cfg.Validate(); err != nil {
		return ExperimentResult{}, err
	}

	parent := ctx
	ctx, cancel := context.WithCancel(parent)
	defer cancel()

	targetURL := baseURL + endpoints[cfg.TargetEndpoint]
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

	out := ExperimentResult{Config: cfg, Results: collected}
	if err := parent.Err(); err != nil && !errors.Is(err, context.Canceled) {
		return out, err
	}
	return out, parent.Err()
}
