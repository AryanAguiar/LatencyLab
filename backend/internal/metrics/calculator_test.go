package metrics

import (
	"testing"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/loadtest"
)

// ----------------------------------------------------------------
// Calculate Latency

func TestCalculateLatency(t *testing.T) {
	tests := []struct {
		name        string
		results     []loadtest.RequestResult
		wantAverage time.Duration
		wantMin     time.Duration
		wantMax     time.Duration
	}{
		{
			name: "normal latencies",
			results: []loadtest.RequestResult{
				{Latency: 100 * time.Millisecond},
				{Latency: 200 * time.Millisecond},
				{Latency: 300 * time.Millisecond},
			},
			wantAverage: 200 * time.Millisecond,
			wantMin:     100 * time.Millisecond,
			wantMax:     300 * time.Millisecond,
		},
		{
			name: "unordered latencies",
			results: []loadtest.RequestResult{
				{Latency: 300 * time.Millisecond},
				{Latency: 100 * time.Millisecond},
				{Latency: 200 * time.Millisecond},
			},
			wantAverage: 200 * time.Millisecond,
			wantMin:     100 * time.Millisecond,
			wantMax:     300 * time.Millisecond,
		},
		{
			name: "single request",
			results: []loadtest.RequestResult{
				{Latency: 500 * time.Millisecond},
			},
			wantAverage: 500 * time.Millisecond,
			wantMin:     500 * time.Millisecond,
			wantMax:     500 * time.Millisecond,
		},
		{
			name:        "empty results",
			results:     nil,
			wantAverage: 0,
			wantMin:     0,
			wantMax:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Calculate(tt.results, 0)

			if got.AverageLatency != tt.wantAverage {
				t.Errorf("AverageLatency = %v, want %v",
					got.AverageLatency, tt.wantAverage)
			}

			if got.MinLatency != tt.wantMin {
				t.Errorf("MinLatency = %v, want %v",
					got.MinLatency, tt.wantMin)
			}

			if got.MaxLatency != tt.wantMax {
				t.Errorf("MaxLatency = %v, want %v",
					got.MaxLatency, tt.wantMax)
			}
		})
	}
}

// ----------------------------------------------------------------
// Request Counts

func TestCalculateRequestCounts(t *testing.T) {
	results := []loadtest.RequestResult{
		{Success: true},
		{Success: true},
		{Success: true},
		{Success: false},
		{Success: false},
	}

	got := Calculate(results, 0)

	if got.TotalRequests != 5 {
		t.Errorf("TotalRequests = %d, want 5", got.TotalRequests)
	}

	if got.SuccessfulRequests != 3 {
		t.Errorf("SuccessfulRequests = %d, want 3", got.SuccessfulRequests)
	}

	if got.FailedRequests != 2 {
		t.Errorf("FailedRequests = %d, want 2", got.FailedRequests)
	}
}

// ----------------------------------------------------------------
// Success and Failure Rates

func TestCalculateRequestRates(t *testing.T) {
	results := []loadtest.RequestResult{
		{Success: true},
		{Success: true},
		{Success: true},
		{Success: false},
		{Success: false},
	}

	got := Calculate(results, 0)

	if got.SuccessRate != 60 {
		t.Errorf("SuccessRate = %f, want 60", got.SuccessRate)
	}

	if got.FailureRate != 40 {
		t.Errorf("FailureRate = %f, want 40", got.FailureRate)
	}
}

// ----------------------------------------------------------------
// Throughput

func TestCalculateThroughput(t *testing.T) {
	results := make([]loadtest.RequestResult, 100)

	got := Calculate(results, 5*time.Second)

	if got.RequestsPerSecond != 20 {
		t.Errorf("RequestsPerSecond = %f, want 20",
			got.RequestsPerSecond)
	}
}

// ----------------------------------------------------------------
// Experiment Duration

func TestCalculateExperimentDuration(t *testing.T) {
	duration := 5 * time.Second

	got := Calculate(nil, duration)

	if got.ExperimentDuration != duration {
		t.Errorf("ExperimentDuration = %v, want %v",
			got.ExperimentDuration, duration)
	}
}

// ----------------------------------------------------------------
// Empty Results

func TestCalculateEmptyResults(t *testing.T) {
	got := Calculate(nil, 0)

	if got.TotalRequests != 0 {
		t.Errorf("TotalRequests = %d, want 0", got.TotalRequests)
	}

	if got.SuccessfulRequests != 0 {
		t.Errorf("SuccessfulRequests = %d, want 0",
			got.SuccessfulRequests)
	}

	if got.FailedRequests != 0 {
		t.Errorf("FailedRequests = %d, want 0",
			got.FailedRequests)
	}

	if got.SuccessRate != 0 {
		t.Errorf("SuccessRate = %f, want 0", got.SuccessRate)
	}

	if got.FailureRate != 0 {
		t.Errorf("FailureRate = %f, want 0", got.FailureRate)
	}

	if got.AverageLatency != 0 {
		t.Errorf("AverageLatency = %v, want 0", got.AverageLatency)
	}

	if got.MinLatency != 0 {
		t.Errorf("MinLatency = %v, want 0", got.MinLatency)
	}

	if got.MaxLatency != 0 {
		t.Errorf("MaxLatency = %v, want 0", got.MaxLatency)
	}

	if got.RequestsPerSecond != 0 {
		t.Errorf("RequestsPerSecond = %f, want 0",
			got.RequestsPerSecond)
	}

	if got.ExperimentDuration != 0 {
		t.Errorf("ExperimentDuration = %v, want 0",
			got.ExperimentDuration)
	}
}

// ----------------------------------------------------------------
// Zero Duration

func TestCalculateZeroDuration(t *testing.T) {
	results := []loadtest.RequestResult{
		{Success: true},
		{Success: true},
		{Success: false},
	}

	got := Calculate(results, 0)

	if got.RequestsPerSecond != 0 {
		t.Errorf("RequestsPerSecond = %f, want 0",
			got.RequestsPerSecond)
	}
}
