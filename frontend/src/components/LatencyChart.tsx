import { Box, Stack, Typography } from '@mui/material'
import type { ExperimentResponse } from '../types'
import { ChartCard } from './ChartCard'

type LatencyChartProps = {
  result: ExperimentResponse | null
}

const chartWidth = 640
const chartHeight = 190
const padding = { top: 12, right: 12, bottom: 26, left: 44 }

export function LatencyChart({ result }: LatencyChartProps) {
  const samples = result?.results.filter((item) => item.latency > 0) ?? []
  const values = samples.map((item) => item.latency / 1_000_000)
  const max = Math.max(...values, 1)
  const min = values.length > 0 ? Math.min(...values) : 0
  const requestCount = result?.results.length ?? samples.length
  const plotWidth = chartWidth - padding.left - padding.right
  const plotHeight = chartHeight - padding.top - padding.bottom
  const segments: string[] = []
  let segment: string[] = []
  values.forEach((value, index) => {
    const requestId = samples[index].request_id
    const x = padding.left + (requestCount < 2 ? plotWidth / 2 : ((requestId - 1) / (requestCount - 1)) * plotWidth)
    const y = padding.top + plotHeight - (value / max) * plotHeight
    if (index > 0 && requestId !== samples[index - 1].request_id + 1) {
      if (segment.length > 1) segments.push(segment.join(' '))
      segment = []
    }
    segment.push(`${x},${y}`)
  })
  if (segment.length > 1) segments.push(segment.join(' '))

  return (
    <ChartCard
      title="Latency by request"
      subtitle={result ? `${samples.length} measured of ${result.results.length} responses · milliseconds` : 'Per-request response time · milliseconds'}
      minHeight={284}
      action={result ? <Typography variant="caption" color="text.secondary">Request ID →</Typography> : undefined}
    >
      {result && samples.length > 0 ? (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
          <Box component="svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Latency for each request in milliseconds" sx={{ width: '100%', height: { xs: 170, md: 190 }, display: 'block' }}>
            {[0, 0.5, 1].map((step) => {
              const y = padding.top + plotHeight * step
              const label = (max * (1 - step)).toFixed(0)
              return (
                <g key={step}>
                  <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="rgba(132,147,165,0.16)" strokeDasharray="3 5" />
                  <text x={padding.left - 9} y={y + 3} textAnchor="end" fill="#8493A5" fontSize="10">{label}</text>
                </g>
              )
            })}
            <line x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} stroke="rgba(132,147,165,0.22)" />
            {segments.map((points, index) => <polyline key={index} points={points} fill="none" stroke="rgba(7,185,206,0.46)" strokeWidth="1.5" />)}
            {values.map((value, index) => {
              const requestId = samples[index].request_id
              const x = padding.left + (requestCount < 2 ? plotWidth / 2 : ((requestId - 1) / (requestCount - 1)) * plotWidth)
              const y = padding.top + plotHeight - (value / max) * plotHeight
              return <circle key={samples[index].request_id} cx={x} cy={y} r={values.length > 40 ? 2 : 3.2} fill={samples[index].success ? '#07B9CE' : '#F07878'} />
            })}
            <text x={padding.left} y={chartHeight - 5} fill="#8493A5" fontSize="10">1</text>
            <text x={chartWidth - padding.right} y={chartHeight - 5} textAnchor="end" fill="#8493A5" fontSize="10">{requestCount}</text>
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Range {min.toFixed(2)}–{Math.max(...values).toFixed(2)} ms</Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption" color="text.secondary">Success</Typography>
            </Stack>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'error.main' }} />
              <Typography variant="caption" color="text.secondary">Failure</Typography>
            </Stack>
          </Stack>
        </Box>
      ) : (
        <Stack sx={{ height: 206, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Box sx={{ width: '100%', height: 110, borderBottom: '1px solid rgba(132,147,165,0.16)', backgroundImage: 'linear-gradient(rgba(132,147,165,0.09) 1px, transparent 1px)', backgroundSize: '100% 27px' }} />
          <Typography variant="caption" color="text.secondary">Run an experiment to plot real request timings</Typography>
        </Stack>
      )}
    </ChartCard>
  )
}
