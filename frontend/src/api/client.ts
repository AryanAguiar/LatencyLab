import type { ExperimentConfig, ExperimentMetrics, ExperimentResponse, RequestResult, SandboxEndpoint } from '../types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

type JsonParser<T> = (value: unknown) => T

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function numberField(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new Error(`Backend returned an invalid experiment metric: ${key}.`)
  }
  return value
}

async function requestJson<T>(path: string, parser: JsonParser<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  const text = await response.text()
  let payload: unknown

  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`Backend returned an invalid response (${response.status}).`)
  }

  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === 'string'
      ? payload.error
      : `Request failed with status ${response.status}.`
    throw new Error(message)
  }

  return parser(payload)
}

export async function checkHealth(): Promise<void> {
  await requestJson('/health', (payload) => {
    if (!isRecord(payload) || payload.status !== 'ok') {
      throw new Error('Backend health check returned an unexpected response.')
    }
    return undefined
  })
}

export function getSandboxEndpoints(): Promise<SandboxEndpoint[]> {
  return requestJson('/api/v1/sandbox/endpoints', (payload) => {
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new Error('Backend returned an invalid endpoint list.')
    }
    return payload.data.map((endpoint): SandboxEndpoint => {
      if (
        !isRecord(endpoint) ||
        typeof endpoint.method !== 'string' ||
        typeof endpoint.path !== 'string' ||
        typeof endpoint.description !== 'string'
      ) {
        throw new Error('Backend returned an invalid endpoint entry.')
      }
      return {
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
      }
    })
  })
}

function parseExperimentResponse(payload: unknown): ExperimentResponse {
  if (!isRecord(payload) || payload.status !== 'completed') {
    throw new Error('Backend returned an invalid experiment response.')
  }
  if (typeof payload.startedAt !== 'string' || typeof payload.durationMs !== 'number' || !isRecord(payload.config) || !isRecord(payload.metrics) || !Array.isArray(payload.results)) {
    throw new Error('Backend returned an incomplete experiment response.')
  }

  const configPayload = payload.config
  const faultsPayload = configPayload.faults
  if (
    typeof configPayload.name !== 'string' ||
    typeof configPayload.target_endpoint !== 'string' ||
    typeof configPayload.requests !== 'number' ||
    typeof configPayload.concurrency !== 'number' ||
    !isRecord(faultsPayload) ||
    typeof faultsPayload.delay_ms !== 'number' ||
    typeof faultsPayload.failure_probability !== 'number' ||
    typeof faultsPayload.timeout_ms !== 'number'
  ) {
    throw new Error('Backend returned an invalid experiment configuration.')
  }

  const metricsPayload = payload.metrics
  const metrics: ExperimentMetrics = {
    total_requests: numberField(metricsPayload, 'total_requests'),
    successful_requests: numberField(metricsPayload, 'successful_requests'),
    failed_requests: numberField(metricsPayload, 'failed_requests'),
    success_rate: numberField(metricsPayload, 'success_rate'),
    failure_rate: numberField(metricsPayload, 'failure_rate'),
    average_latency_ns: numberField(metricsPayload, 'average_latency_ns'),
    min_latency_ns: numberField(metricsPayload, 'min_latency_ns'),
    max_latency_ns: numberField(metricsPayload, 'max_latency_ns'),
    p50_latency_ns: numberField(metricsPayload, 'p50_latency_ns'),
    p95_latency_ns: numberField(metricsPayload, 'p95_latency_ns'),
    p99_latency_ns: numberField(metricsPayload, 'p99_latency_ns'),
    requests_per_second: numberField(metricsPayload, 'requests_per_second'),
    experiment_duration_ns: numberField(metricsPayload, 'experiment_duration_ns'),
  }

  const results: RequestResult[] = payload.results.map((result): RequestResult => {
    if (
      !isRecord(result) ||
      typeof result.request_id !== 'number' ||
      typeof result.status_code !== 'number' ||
      typeof result.latency !== 'number' ||
      typeof result.error !== 'string' ||
      typeof result.success !== 'boolean'
    ) {
      throw new Error('Backend returned an invalid request result.')
    }
    return {
      request_id: result.request_id,
      status_code: result.status_code,
      latency: result.latency,
      error: result.error,
      success: result.success,
    }
  })

  const config: ExperimentConfig = {
    name: configPayload.name,
    target_endpoint: configPayload.target_endpoint,
    requests: configPayload.requests,
    concurrency: configPayload.concurrency,
    faults: {
      delay_ms: faultsPayload.delay_ms,
      failure_probability: faultsPayload.failure_probability,
      timeout_ms: faultsPayload.timeout_ms,
    },
  }
  return {
    status: 'completed',
    startedAt: payload.startedAt,
    durationMs: payload.durationMs,
    config,
    metrics,
    results,
  }
}

export function runExperiment(config: ExperimentConfig): Promise<ExperimentResponse> {
  return requestJson('/api/v1/experiments/run', parseExperimentResponse, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
}
