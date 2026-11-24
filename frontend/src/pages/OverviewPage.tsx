import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import type { ExperimentResponse } from '../types'
import { ChartCard } from '../components/ChartCard'
import { LatencyChart } from '../components/LatencyChart'
import { MetricCard } from '../components/MetricCard'
import { ThroughputChart } from '../components/ThroughputChart'
import { formatLatency } from '../utils/format'

type OverviewPageProps = {
  result: ExperimentResponse | null
  connectionStatus: 'checking' | 'connected' | 'offline'
  onRun: () => void
}

export function OverviewPage({ result, connectionStatus, onRun }: OverviewPageProps) {
  const metrics = result?.metrics
  const connection = {
    checking: { label: 'Checking connection', detail: 'Health check in progress.', color: 'text.secondary' },
    connected: { label: 'Backend connected', detail: 'Health endpoint responded successfully.', color: 'success.main' },
    offline: { label: 'Backend unreachable', detail: 'Start the API server to run experiments.', color: 'error.main' },
  }[connectionStatus]

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
          <Box>
            <Typography variant="overline" color="primary.main">SANDBOX / PERFORMANCE</Typography>
            <Typography variant="h1" sx={{ mt: 0.6 }}>System overview</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              A clear read on how your endpoints behave under pressure.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={onRun}
            startIcon={<Box component="svg" viewBox="0 0 20 20" aria-hidden="true" sx={{ width: 16, height: 16 }}><path d="M7 4.5v11l8-5.5-8-5.5z" fill="currentColor" /></Box>}
            sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, px: 2, py: 0.7 }}
          >
            Run experiment
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
            gap: 1.25,
          }}
        >
          <MetricCard label="TOTAL REQUESTS" value={metrics ? String(metrics.total_requests) : '—'} detail={metrics ? 'Latest completed experiment' : 'Awaiting first experiment'} tone="cyan" />
          <MetricCard label="AVG. LATENCY" value={metrics ? formatLatency(metrics.average_latency_ns) : '—'} detail={metrics ? 'Across measured requests' : 'No measurements yet'} tone="blue" />
          <MetricCard label="P95 LATENCY" value={metrics ? formatLatency(metrics.p95_latency_ns) : '—'} detail={metrics ? '95th percentile' : 'No measurements yet'} tone="violet" />
          <MetricCard label="SUCCESS RATE" value={metrics ? `${metrics.success_rate.toFixed(1)}%` : '—'} detail={metrics ? `${metrics.failed_requests} failed requests` : 'No measurements yet'} tone="cyan" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.65fr) minmax(280px, 0.85fr)' }, gap: 1.5 }}>
          <LatencyChart result={result} />
          <ThroughputChart result={result} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.65fr) minmax(280px, 0.85fr)' }, gap: 1.5 }}>
          <ChartCard title="Recent experiment" subtitle="Most recent run in this session" minHeight={176}>
            {result ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, minHeight: 92 }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="subtitle1">{result.config.name}</Typography>
                    <Chip label="COMPLETED" size="small" sx={{ height: 20, color: 'success.main', bgcolor: 'rgba(88,214,164,0.10)', fontSize: '0.6rem', fontWeight: 700 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.6 }}>
                    GET /sandbox/api/{result.config.target_endpoint} · {result.config.requests} requests · concurrency {result.config.concurrency}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {result.durationMs} ms total
                </Typography>
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ minHeight: 92, justifyContent: 'center', alignItems: { sm: 'center' } }}>
                <Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, color: 'primary.main', flexShrink: 0 }}>
                  <Box component="svg" viewBox="0 0 24 24" aria-hidden="true" sx={{ width: 18, height: 18 }}>
                    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>No experiments recorded</Typography>
                  <Typography variant="caption" color="text.secondary">Your first run will add real request metrics and latency samples here.</Typography>
                </Box>
              </Stack>
            )}
          </ChartCard>

          <ChartCard title="Connection" subtitle="Backend reachability" minHeight={176}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minHeight: 92 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: connection.color }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{connection.label}</Typography>
                <Typography variant="caption" color="text.secondary">{connection.detail}</Typography>
              </Box>
            </Stack>
          </ChartCard>
        </Box>
      </Stack>
    </Box>
  )
}
