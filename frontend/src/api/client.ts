import type { ExperimentConfig, ExperimentHistoryItem, ExperimentMetrics, ExperimentResponse, RequestResult, SandboxEndpoint } from '../types'

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

function isExperimentStatus(value: unknown): value is ExperimentHistoryItem['status'] {
  return value === 'running' || value === 'completed' || value === 'failed' || value === 'cancelled'
}

function parseExperimentMetrics(payload: unknown): ExperimentMetrics {
  if (!isRecord(payload)) {
    throw new Error('Backend returned invalid experiment metrics.')
  }
  return {
    total_requests: numberField(payload, 'total_requests'),
    successful_requests: numberField(payload, 'successful_requests'),
    failed_requests: numberField(payload, 'failed_requests'),
    success_rate: numberField(payload, 'success_rate'),
    failure_rate: numberField(payload, 'failure_rate'),
    average_latency_ns: numberField(payload, 'average_latency_ns'),
    min_latency_ns: numberField(payload, 'min_latency_ns'),
    max_latency_ns: numberField(payload, 'max_latency_ns'),
    p50_latency_ns: numberField(payload, 'p50_latency_ns'),
    p95_latency_ns: numberField(payload, 'p95_latency_ns'),
    p99_latency_ns: numberField(payload, 'p99_latency_ns'),
    requests_per_second: numberField(payload, 'requests_per_second'),
    experiment_duration_ns: numberField(payload, 'experiment_duration_ns'),
  }
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
  const metrics = parseExperimentMetrics(metricsPayload)

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

export function getExperimentHistory(limit = 100, offset = 0): Promise<ExperimentHistoryItem[]> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  return requestJson(`/api/v1/experiments?${query}`, (payload) => {
    if (!isRecord(payload) || !Array.isArray(payload.experiments)) {
      throw new Error('Backend returned an invalid experiment history.')
    }

    return payload.experiments.map((item): ExperimentHistoryItem => {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        !isExperimentStatus(item.status) ||
        typeof item.experiment_type !== 'string' ||
        typeof item.target_endpoint !== 'string' ||
        (item.started_at !== null && typeof item.started_at !== 'string') ||
        (item.completed_at !== null && typeof item.completed_at !== 'string') ||
        typeof item.created_at !== 'string'
      ) {
        throw new Error('Backend returned an invalid experiment history entry.')
      }

      let metrics: ExperimentMetrics | null = null
      if (isRecord(item.metrics) && typeof item.metrics.total_requests === 'number') {
        metrics = parseExperimentMetrics(item.metrics)
      }

      return {
        id: item.id,
        status: item.status,
        experiment_type: item.experiment_type,
        target_endpoint: item.target_endpoint,
        metrics,
        started_at: item.started_at,
        completed_at: item.completed_at,
        created_at: item.created_at,
      }
    })
  })
}
