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
        <Stack sx={{ height: '100%', minHeight: 178, justifyContent: 'space-between', pt: 1.25, pb: 0.25 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', height: 44 }}>
            <Typography sx={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-0.06em', fontVariantNumeric: 'tabular-nums' }}>
              {rate?.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">req/s</Typography>
          </Stack>
          <Box sx={{ px: 0.5, mt: 1 }}>
            <Box sx={{ height: 1, bgcolor: 'rgba(132,147,165,0.24)', position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: `${marker}%`, top: -5, width: 9, height: 9, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: '0 0 12px rgba(7,185,206,0.55)', transform: 'translateX(-50%)' }} />
            </Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.75, height: 16 }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>0</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>{scaleMax} req/s</Typography>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25, lineHeight: 1.35, minHeight: 32 }}>
            Average across this experiment. The API does not provide a per-second time series.
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ minHeight: 178, height: '100%', display: 'grid', gridTemplateRows: '44px 32px 32px', alignContent: 'center', justifyItems: 'center' }}>
          {/* <Typography sx={{ alignSelf: 'end', mb: 0.5, fontSize: '1.8rem', fontWeight: 600, lineHeight: 1, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
            —
          </Typography>
          <Box sx={{ width: '100%', height: 1, bgcolor: 'rgba(132,147,165,0.18)', position: 'relative', alignSelf: 'center' }}>
            {[25, 50, 75].map((position) => (
              <Box key={position} sx={{ position: 'absolute', left: `${position}%`, top: -3, width: 1, height: 7, bgcolor: 'rgba(132,147,165,0.28)' }} />
            ))}
          </Box> */}
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'start', mt: 1.25, lineHeight: 1.2 }}>
            No throughput measurement yet
          </Typography>
        </Box>
      )}
    </ChartCard>
  )
}
