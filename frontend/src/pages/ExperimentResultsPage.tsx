import { Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import type { ExperimentMetrics, ExperimentResponse } from '../types'
import { ChartCard } from '../components/ChartCard'
import { LatencyChart } from '../components/LatencyChart'
import { ResultsSummary } from '../components/ResultsSummary'
import { formatDuration, formatLatency } from '../utils/format'

type ExperimentResultsPageProps = {
  result: ExperimentResponse | null
  onNewExperiment: () => void
}

function LatencyDistribution({ metrics }: { metrics: ExperimentMetrics }) {
  const values = [
    { label: 'P50', ns: metrics.p50_latency_ns },
    { label: 'P95', ns: metrics.p95_latency_ns },
    { label: 'P99', ns: metrics.p99_latency_ns },
  ]
  const maxMs = Math.max(...values.map((item) => item.ns / 1_000_000), 0.01)

  return (
    <ChartCard title="Latency percentiles" subtitle="Response-time distribution · milliseconds" minHeight={284}>
      <Stack spacing={2.2} sx={{ py: 2 }}>
        {values.map((item) => {
          const valueMs = item.ns / 1_000_000
          const width = Math.max(2, (valueMs / maxMs) * 100)
          return (
            <Box key={item.label}>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.8 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>{item.label}</Typography>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatLatency(item.ns)}</Typography>
              </Stack>
              <Box sx={{ height: 5, bgcolor: 'rgba(132,147,165,0.12)', overflow: 'hidden' }}>
                <Box sx={{ width: `${width}%`, height: '100%', bgcolor: item.label === 'P99' ? '#7D2AE7' : item.label === 'P95' ? '#3969E7' : '#07B9CE', transition: 'width 250ms ease' }} />
              </Box>
            </Box>
          )
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary">Nearest-rank percentiles reported by the backend.</Typography>
    </ChartCard>
  )
}

function ConfigurationCard({ result }: { result: ExperimentResponse }) {
  const { config } = result
  const rows = [
    ['Target', `GET /sandbox/api/${config.target_endpoint}`],
    ['Requests / concurrency', `${config.requests} / ${config.concurrency}`],
    ['Artificial delay', `${config.faults.delay_ms} ms`],
    ['Failure probability', `${(config.faults.failure_probability * 100).toFixed(0)}%`],
    ['Timeout', config.faults.timeout_ms === 0 ? 'Off' : `${config.faults.timeout_ms} ms`],
    ['Started', new Date(result.startedAt).toLocaleString()],
  ]

  return (
    <ChartCard title="Run configuration" subtitle="Settings captured with this experiment" minHeight={254}>
      <Stack spacing={1.2} sx={{ pt: 1 }}>
        {rows.map(([label, value]) => (
          <Stack key={label} direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="caption" sx={{ color: 'text.primary', textAlign: 'right', fontFamily: label === 'Target' ? 'monospace' : undefined }}>{value}</Typography>
          </Stack>
        ))}
      </Stack>
    </ChartCard>
  )
}

function RequestTable({ result }: { result: ExperimentResponse }) {
  return (
    <ChartCard title="Request log" subtitle={`${result.results.length} individual responses`} minHeight={250}>
      <TableContainer sx={{ maxHeight: 340, mt: 1 }}>
        <Table size="small" stickyHeader aria-label="Experiment request results">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Request</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Status</TableCell>
              <TableCell align="right" sx={{ bgcolor: 'background.paper' }}>Latency</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Outcome</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.results.map((request) => (
              <TableRow key={request.request_id} hover>
                <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>#{request.request_id}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{request.status_code || '—'}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatLatency(request.latency)}</TableCell>
                <TableCell>
                  <Chip
                    label={request.success ? 'OK' : 'FAILED'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: request.success ? 'success.main' : 'error.main',
                      bgcolor: request.success ? 'rgba(88,214,164,0.08)' : 'rgba(240,120,120,0.08)',
                    }}
                  />
                  {!request.success && request.error && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {request.error}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </ChartCard>
  )
}

export function ExperimentResultsPage({ result, onNewExperiment }: ExperimentResultsPageProps) {
  if (!result) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, sm: 3 }, py: 5 }}>
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="overline" color="primary.main">RESULTS</Typography>
          <Typography variant="h1">No completed run</Typography>
          <Typography color="text.secondary">Run an experiment to see request metrics and latency distributions.</Typography>
          <Button variant="contained" onClick={onNewExperiment} sx={{ mt: 1 }}>Configure an experiment</Button>
        </Stack>
      </Box>
    )
  }

  const { metrics } = result
  const durationMs = result.durationMs || metrics.experiment_duration_ns / 1_000_000

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
          <Box>
            <Typography variant="overline" color="primary.main">EXPERIMENTS / RESULTS</Typography>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mt: 0.5 }}>
              <Typography variant="h1">{result.config.name}</Typography>
              <Chip label="COMPLETED" size="small" sx={{ height: 21, color: 'success.main', bgcolor: 'rgba(88,214,164,0.10)', fontSize: '0.6rem', fontWeight: 700 }} />
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              GET /sandbox/api/{result.config.target_endpoint} · ran in {formatDuration(durationMs)}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={onNewExperiment} sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}>New experiment</Button>
        </Stack>

        <ResultsSummary metrics={metrics} />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.5fr) minmax(280px, 0.85fr)' }, gap: 1.5 }}>
          <LatencyChart result={result} />
          <LatencyDistribution metrics={metrics} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
          <MetricDetail label="Average latency" value={formatLatency(metrics.average_latency_ns)} note="Mean of measured responses" />
          <MetricDetail label="Minimum latency" value={formatLatency(metrics.min_latency_ns)} note="Fastest measured response" />
          <MetricDetail label="Maximum latency" value={formatLatency(metrics.max_latency_ns)} note="Slowest measured response" />
          <MetricDetail label="Requests / second" value={metrics.requests_per_second.toFixed(2)} note="Average across the full run" />
          <MetricDetail label="Experiment duration" value={formatDuration(durationMs)} note="Wall-clock execution time" />
          <ConfigurationCard result={result} />
        </Box>

        <RequestTable result={result} />
      </Stack>
    </Box>
  )
}

function MetricDetail({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Box sx={{ minHeight: 100, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ mt: 1, fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{note}</Typography>
    </Box>
  )
}
