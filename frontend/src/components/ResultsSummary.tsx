import { Box } from '@mui/material'
import type { ExperimentMetrics } from '../types'
import { MetricCard } from './MetricCard'

type ResultsSummaryProps = {
  metrics: ExperimentMetrics
}

export function ResultsSummary({ metrics }: ResultsSummaryProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1.25 }}>
      <MetricCard label="TOTAL REQUESTS" value={String(metrics.total_requests)} detail="Completed in this run" tone="cyan" />
      <MetricCard label="SUCCESSFUL" value={String(metrics.successful_requests)} detail="HTTP 2xx responses" tone="cyan" />
      <MetricCard label="FAILED" value={String(metrics.failed_requests)} detail="Non-2xx or timed out" tone="violet" />
      <MetricCard label="SUCCESS RATE" value={`${metrics.success_rate.toFixed(1)}%`} detail="Of total requests" tone="blue" />
      <MetricCard label="FAILURE RATE" value={`${metrics.failure_rate.toFixed(1)}%`} detail="Of total requests" tone="violet" />
    </Box>
  )
}
