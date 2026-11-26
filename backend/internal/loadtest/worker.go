package loadtest

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/faults"
)

type ExperimentConfig struct {
	ExperimentType string        `json:"experiment_type,omitempty"`
	Name           string        `json:"name"`
	TargetEndpoint string        `json:"target_endpoint"`
	Requests       int           `json:"requests"`
	Concurrency    int           `json:"concurrency"`
	Faults         faults.Config `json:"faults"`
}

type RequestResult struct {
	RequestID  int           `json:"request_id"`
	StatusCode int           `json:"status_code"`
	Latency    time.Duration `json:"latency"`
	Error      string        `json:"error"`
	Success    bool          `json:"success"`
}

type RequestJob struct {
	ID int
}

func doRequest(
	ctx context.Context,
	client *http.Client,
	targetURL string,
	job RequestJob,
) RequestResult {
	result := RequestResult{RequestID: job.ID}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		result.Latency = time.Since(start)
		result.Error = err.Error()
		return result
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	result.Latency = time.Since(start)

	result.StatusCode = resp.StatusCode
	result.Success = resp.StatusCode >= 200 && resp.StatusCode < 300
	if !result.Success {
		result.Error = fmt.Sprintf("server returned %d", resp.StatusCode)
	}

	return result
}

func worker(
	ctx context.Context,
	jobs <-chan RequestJob,
	results chan<- RequestResult,
	client *http.Client,
	targetURL string,
) {
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}

			result := doRequest(ctx, client, targetURL, job)
			select {
			case results <- result:
			case <-ctx.Done():
				return
			}
		}
	}
}
