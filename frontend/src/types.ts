export type ExperimentConfig = {
  name: string
  target_endpoint: string
  requests: number
  concurrency: number
  faults: {
    delay_ms: number
    failure_probability: number
    timeout_ms: number
  }
}

export type RequestResult = {
  request_id: number
  status_code: number
  latency: number
  error: string
  success: boolean
}

export type ExperimentMetrics = {
  total_requests: number
  successful_requests: number
  failed_requests: number
  success_rate: number
  failure_rate: number
  average_latency_ns: number
  min_latency_ns: number
  max_latency_ns: number
  p50_latency_ns: number
  p95_latency_ns: number
  p99_latency_ns: number
  requests_per_second: number
  experiment_duration_ns: number
}

export type ExperimentResponse = {
  status: 'completed'
  startedAt: string
  durationMs: number
  config: ExperimentConfig
  metrics: ExperimentMetrics
  results: RequestResult[]
}

export type SandboxEndpoint = {
  method: string
  path: string
  description: string
}
