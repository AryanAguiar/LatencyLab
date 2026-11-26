import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { getExperimentHistory } from '../api/client'
import type { ExperimentHistoryItem, ExperimentMetrics } from '../types'
import { formatLatency } from '../utils/format'

function formatTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function endpointPath(endpoint: string) {
  return `/sandbox/api/${endpoint}`
}

function completedWithMetrics(item: ExperimentHistoryItem) {
  return item.status === 'completed' && item.metrics !== null
}

function RunSelect({
  label,
  value,
  items,
  accent,
  onChange,
}: {
  label: string
  value: string
  items: ExperimentHistoryItem[]
  accent: string
  onChange: (value: string) => void
}) {
  const inputId = `${label.toLowerCase().replaceAll(' ', '-')}-select`

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderTop: `2px solid ${accent}`, bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: accent }} />
        <Typography variant="overline" color="text.secondary">{label}</Typography>
      </Stack>
      <FormControl size="small" fullWidth disabled={items.length === 0}>
        <InputLabel id={`${inputId}-label`}>Completed run</InputLabel>
        <Select
          labelId={`${inputId}-label`}
          id={inputId}
          value={value}
          label="Completed run"
          onChange={(event) => onChange(event.target.value)}
        >
          {items.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {endpointPath(item.target_endpoint)} · {formatTime(item.started_at)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {items.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {items.find((item) => item.id === value)?.id ?? 'Select a previous completed run'}
        </Typography>
      )}
    </Box>
  )
}

function metricRows(a: ExperimentMetrics, b: ExperimentMetrics) {
  return [
    { label: 'Total requests', a: String(a.total_requests), b: String(b.total_requests) },
    { label: 'Success rate', a: `${a.success_rate.toFixed(1)}%`, b: `${b.success_rate.toFixed(1)}%` },
    { label: 'Average latency', a: formatLatency(a.average_latency_ns), b: formatLatency(b.average_latency_ns) },
    { label: 'P95 latency', a: formatLatency(a.p95_latency_ns), b: formatLatency(b.p95_latency_ns) },
    { label: 'Requests / second', a: a.requests_per_second.toFixed(2), b: b.requests_per_second.toFixed(2) },
  ]
}

function Comparison({ a, b }: { a: ExperimentHistoryItem; b: ExperimentHistoryItem }) {
  const metricsA = a.metrics
  const metricsB = b.metrics
  if (!metricsA || !metricsB) return null

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, borderBottom: '1px solid', borderColor: 'divider' }}>
        {[{ label: 'RUN A', item: a, accent: '#07B9CE' }, { label: 'RUN B', item: b, accent: '#7AB6FF' }].map(({ label, item, accent }) => (
          <Box key={label} sx={{ p: 2, borderTop: `2px solid ${accent}`, '&:first-of-type': { borderRight: { sm: '1px solid', borderColor: 'divider' } } }}>
            <Typography variant="overline" color="text.secondary">{label} · {item.experiment_type}</Typography>
            <Typography sx={{ mt: 0.6, fontFamily: 'monospace', fontSize: '0.95rem', color: accent }}>
              GET {endpointPath(item.target_endpoint)}
            </Typography>
            <Typography variant="caption" color="text.secondary">{formatTime(item.started_at)} · {item.id}</Typography>
          </Box>
        ))}
      </Box>
      <Table size="small" aria-label="Experiment metrics comparison">
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell align="right" sx={{ color: 'primary.main' }}>Run A</TableCell>
            <TableCell align="right" sx={{ color: '#7AB6FF' }}>Run B</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metricRows(metricsA, metricsB).map((row) => (
            <TableRow key={row.label}>
              <TableCell sx={{ color: 'text.secondary' }}>{row.label}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.a}</TableCell>
              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.b}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function PreviousRuns({ items }: { items: ExperimentHistoryItem[] }) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', px: 2, py: 1.7 }}>
        <Box>
          <Typography variant="h3">Previous endpoints</Typography>
          <Typography variant="caption" color="text.secondary">Endpoint and outcome captured for each saved run</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">{items.length} runs</Typography>
      </Stack>
      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader aria-label="Previous experiment endpoints">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Endpoint</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Status</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Requests</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Average</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>P95</TableCell>
              <TableCell sx={{ bgcolor: 'background.paper' }}>Started</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>GET {endpointPath(item.target_endpoint)}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.experiment_type} · {item.id.slice(0, 8)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: item.status === 'completed' ? 'success.main' : item.status === 'running' ? 'primary.main' : 'error.main',
                      bgcolor: item.status === 'completed' ? 'rgba(88,214,164,0.09)' : item.status === 'running' ? 'rgba(7,185,206,0.09)' : 'rgba(240,120,120,0.08)',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.metrics?.total_requests ?? '—'}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.metrics ? formatLatency(item.metrics.average_latency_ns) : '—'}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.metrics ? formatLatency(item.metrics.p95_latency_ns) : '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTime(item.started_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export function ComparePage() {
  const [history, setHistory] = useState<ExperimentHistoryItem[]>([])
  const [selectedA, setSelectedA] = useState('')
  const [selectedB, setSelectedB] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applyHistory = useCallback((items: ExperimentHistoryItem[]) => {
    const completedRuns = items.filter(completedWithMetrics)
    setHistory(items)
    setSelectedA((current) => completedRuns.some((item) => item.id === current) ? current : completedRuns[0]?.id ?? '')
    setSelectedB((current) => completedRuns.some((item) => item.id === current) ? current : completedRuns[1]?.id ?? '')
  }, [])

  useEffect(() => {
    let active = true
    getExperimentHistory()
      .then((items) => {
        if (active) applyHistory(items)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load previous experiments.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyHistory])

  const refreshHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      applyHistory(await getExperimentHistory())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load previous experiments.')
    } finally {
      setLoading(false)
    }
  }, [applyHistory])

  const completed = useMemo(() => history.filter(completedWithMetrics), [history])
  const runA = completed.find((item) => item.id === selectedA)
  const runB = completed.find((item) => item.id === selectedB)

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
          <Box>
            <Typography variant="overline" color="primary.main">HISTORY / COMPARISON</Typography>
            <Typography variant="h1" sx={{ mt: 0.6 }}>Compare runs</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Put saved endpoint runs side by side, then inspect the full experiment history below.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => void refreshHistory()} disabled={loading}>
            {loading ? <CircularProgress size={18} color="inherit" /> : 'Refresh history'}
          </Button>
        </Stack>

        {error && <Alert severity="error" variant="outlined">{error}</Alert>}
        {loading && history.length === 0 ? (
          <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
              <CircularProgress size={22} />
              <Typography variant="caption" color="text.secondary">Reading saved experiment history…</Typography>
            </Stack>
          </Box>
        ) : history.length === 0 && !error ? (
          <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2.5, md: 4 } }}>
            <Typography variant="overline" color="primary.main">NO SAVED RUNS</Typography>
            <Typography variant="h2" sx={{ mt: 0.7 }}>Your endpoint history will appear here</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Run an experiment first. Completed endpoint runs will become available for comparison and appear in the history table.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>
              <RunSelect label="Run A" value={selectedA} items={completed} accent="#07B9CE" onChange={setSelectedA} />
              <RunSelect label="Run B" value={selectedB} items={completed} accent="#7AB6FF" onChange={setSelectedB} />
            </Box>

            {runA && runB ? (
              <Comparison a={runA} b={runB} />
            ) : (
              <Box sx={{ border: '1px dashed', borderColor: 'divider', p: 2.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {completed.length === 1 ? 'One completed run is available. Run another experiment to compare results.' : 'No completed runs with metrics are available to compare yet.'}
                </Typography>
              </Box>
            )}

            {history.length > 0 && <PreviousRuns items={history} />}
          </>
        )}
      </Stack>
    </Box>
  )
}
