package metrics

import (
	"math"
	"sort"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/loadtest"
)

type ExperimentMetrics struct {
	TotalRequests      int           `json:"total_requests"`
	SuccessfulRequests int           `json:"successful_requests"`
	FailedRequests     int           `json:"failed_requests"`
	SuccessRate        float64       `json:"success_rate"`
	FailureRate        float64       `json:"failure_rate"`
	AverageLatency     time.Duration `json:"average_latency_ns"`
	MinLatency         time.Duration `json:"min_latency_ns"`
	MaxLatency         time.Duration `json:"max_latency_ns"`
	P50Latency         time.Duration `json:"p50_latency_ns"`
	P95Latency         time.Duration `json:"p95_latency_ns"`
	P99Latency         time.Duration `json:"p99_latency_ns"`
	RequestsPerSecond  float64       `json:"requests_per_second"`
	ExperimentDuration time.Duration `json:"experiment_duration_ns"`
}

func Calculate(results []loadtest.RequestResult, duration time.Duration) ExperimentMetrics {
	var m ExperimentMetrics
	var totalLatency time.Duration
	var minLatency time.Duration
	var maxLatency time.Duration
	var latencyCount int
	latencies := make([]time.Duration, 0, len(results))

	m.TotalRequests = len(results)
	m.ExperimentDuration = duration

	for _, r := range results {
		if r.Success {
			m.SuccessfulRequests++
		} else {
			m.FailedRequests++
		}

		if r.Latency <= 0 {
			continue
		}

		if latencyCount == 0 {
			minLatency = r.Latency
			maxLatency = r.Latency
		} else {
			if r.Latency < minLatency {
				minLatency = r.Latency
			}
			if r.Latency > maxLatency {
				maxLatency = r.Latency
			}
		}

		totalLatency += r.Latency
		latencyCount++
		latencies = append(latencies, r.Latency)
	}

	if m.TotalRequests > 0 {
		total := float64(m.TotalRequests)
		m.SuccessRate = float64(m.SuccessfulRequests) / total * 100
		m.FailureRate = float64(m.FailedRequests) / total * 100
	}

	if duration > 0 {
		m.RequestsPerSecond = float64(m.TotalRequests) / duration.Seconds()
	}

	if latencyCount > 0 {
		m.AverageLatency = totalLatency / time.Duration(latencyCount)
		m.MinLatency = minLatency
		m.MaxLatency = maxLatency

		sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
		m.P50Latency = percentile(latencies, 50)
		m.P95Latency = percentile(latencies, 95)
		m.P99Latency = percentile(latencies, 99)
	}

	return m
}

func percentile(sorted []time.Duration, p float64) time.Duration {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(math.Ceil(p*float64(len(sorted))/100)) - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(sorted) {
		idx = len(sorted) - 1
	}
	return sorted[idx]
}
