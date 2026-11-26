import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, FormControl, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { ExperimentConfig, SandboxEndpoint } from '../types'
import { formatDuration } from '../utils/format'
import { FaultConfiguration } from './FaultConfiguration'

const recommendedMaxDurationMs = 20_000
const maxExperimentRuntimeMs = 5 * 60 * 1000

type ExperimentFormProps = {
  endpoints: SandboxEndpoint[]
  disabled?: boolean
  onSubmit: (config: ExperimentConfig) => void
}

export function ExperimentForm({ endpoints, disabled = false, onSubmit }: ExperimentFormProps) {
  const [name, setName] = useState('Sandbox load test')
  const [targetEndpoint, setTargetEndpoint] = useState('products')
  const [requests, setRequests] = useState(50)
  const [concurrency, setConcurrency] = useState(5)
  const [timeoutMs, setTimeoutMs] = useState(2500)
  const [delayEnabled, setDelayEnabled] = useState(false)
  const [delayMs, setDelayMs] = useState(250)
  const [failureEnabled, setFailureEnabled] = useState(false)
  const [failureProbability, setFailureProbability] = useState(0.1)
  const endpointOptions = endpoints.map((endpoint) => ({
    id: endpoint.path.split('/').filter(Boolean).pop() ?? '',
    ...endpoint,
  }))
  const selectedEndpoint = endpointOptions.some((endpoint) => endpoint.id === targetEndpoint)
    ? targetEndpoint
    : endpointOptions[0]?.id ?? ''
  const delayForEstimate = delayEnabled ? delayMs : 0
  const durationPerRequest = timeoutMs > 0 ? Math.min(delayForEstimate, timeoutMs) : delayForEstimate
  const estimatedDurationMs = Math.ceil(requests / Math.max(concurrency, 1)) * Math.max(durationPerRequest, 0)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedEndpoint) return
    onSubmit({
      name: name.trim() || 'Sandbox load test',
      target_endpoint: selectedEndpoint,
      requests,
      concurrency,
      faults: {
        delay_ms: delayEnabled ? delayMs : 0,
        failure_probability: failureEnabled ? failureProbability : 0,
        timeout_ms: timeoutMs,
      },
    })
  }

  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2.2}>
        <Box>
          <Typography variant="h3">Target configuration</Typography>
          <Typography variant="caption" color="text.secondary">Choose a safe, predefined endpoint and define the load profile.</Typography>
        </Box>

        <TextField
          label="Experiment name"
          size="small"
          fullWidth
          value={name}
          onChange={(event) => setName(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 80 } }}
        />

        <FormControl fullWidth size="small">
          <TextField
            select
            label="Sandbox endpoint"
            value={selectedEndpoint}
            onChange={(event) => setTargetEndpoint(event.target.value)}
            helperText={endpointOptions.find((endpoint) => endpoint.id === selectedEndpoint)?.description ?? 'Waiting for the backend endpoint catalog.'}
          >
            {endpointOptions.map((endpoint) => (
              <MenuItem key={endpoint.id} value={endpoint.id}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'primary.main', fontWeight: 700 }}>GET</Typography>
                  <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{endpoint.path}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
        </FormControl>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
          <TextField
            label="Request count"
            type="number"
            size="small"
            value={requests}
            onChange={(event) => setRequests(Number(event.target.value))}
            slotProps={{ htmlInput: { min: 1, max: 100 } }}
            helperText="1–100 requests"
          />
          <TextField
            label="Concurrency"
            type="number"
            size="small"
            value={concurrency}
            onChange={(event) => setConcurrency(Number(event.target.value))}
            slotProps={{ htmlInput: { min: 1, max: 10 } }}
            helperText="1–10 workers"
          />
          <TextField
            label="Timeout"
            type="number"
            size="small"
            value={timeoutMs}
            onChange={(event) => setTimeoutMs(Number(event.target.value))}
            slotProps={{ htmlInput: { min: 0, max: 10000, step: 1 } }}
            helperText="0–10,000 ms · 0 = off"
            sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
          />
        </Box>

        {estimatedDurationMs > recommendedMaxDurationMs && (
          <Alert severity="warning" variant="outlined">
            This configuration is estimated to take about {formatDuration(estimatedDurationMs)}; the recommended maximum is 20 seconds.
            It will still run, but may take a while. Lower requests or delay, or raise concurrency to shorten it.
            {estimatedDurationMs > maxExperimentRuntimeMs && ' The server will stop a run after 5 minutes.'}
          </Alert>
        )}

        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <FaultConfiguration
            delayEnabled={delayEnabled}
            delayMs={delayMs}
            failureEnabled={failureEnabled}
            failureProbability={failureProbability}
            onDelayEnabledChange={setDelayEnabled}
            onDelayChange={setDelayMs}
            onFailureEnabledChange={setFailureEnabled}
            onFailureChange={setFailureProbability}
          />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Max 100 requests · 10 concurrent workers
          </Typography>
          <Button type="submit" variant="contained" color="primary" disabled={disabled || endpointOptions.length === 0} sx={{ minWidth: 170 }}>
            Run experiment
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
