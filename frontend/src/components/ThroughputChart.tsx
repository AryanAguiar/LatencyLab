import { Box, Stack, Typography } from '@mui/material'
import type { ExperimentResponse } from '../types'
import { ChartCard } from './ChartCard'

type ThroughputChartProps = {
  result: ExperimentResponse | null
}

export function ThroughputChart({ result }: ThroughputChartProps) {
  const rate = result?.metrics.requests_per_second
  const scaleMax = rate ? Math.max(1, Math.ceil(rate / 4) * 4) : 1
  const marker = rate ? Math.min(95, Math.max(5, (rate / scaleMax) * 100)) : 5

  return (
    <ChartCard title="Request throughput" subtitle="Observed completion rate · requests / second">
      {result ? (
        <Stack sx={{ height: '100%', minHeight: 178, justifyContent: 'center', gap: 2 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-0.06em', fontVariantNumeric: 'tabular-nums' }}>
              {rate?.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">req/s</Typography>
          </Stack>
          <Box sx={{ px: 0.5 }}>
            <Box sx={{ height: 1, bgcolor: 'rgba(132,147,165,0.24)', position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: `${marker}%`, top: -5, width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: '0 0 12px rgba(7,185,206,0.55)', transform: 'translateX(-50%)' }} />
            </Box>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">0</Typography>
              <Typography variant="caption" color="text.secondary">{scaleMax} req/s</Typography>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Average across this experiment. The API does not provide a per-second time series.
          </Typography>
        </Stack>
      ) : (
        <Stack sx={{ minHeight: 178, justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 1 }}>
          <Box sx={{ width: '100%', maxWidth: 250, height: 1, bgcolor: 'rgba(132,147,165,0.18)', position: 'relative' }}>
            {[25, 50, 75].map((position) => (
              <Box key={position} sx={{ position: 'absolute', left: `${position}%`, top: -3, width: 1, height: 7, bgcolor: 'rgba(132,147,165,0.28)' }} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">No throughput measurement yet</Typography>
        </Stack>
      )}
    </ChartCard>
  )
}
