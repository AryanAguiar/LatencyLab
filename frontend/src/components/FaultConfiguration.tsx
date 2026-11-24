import { Box, FormControlLabel, InputAdornment, Stack, Switch, TextField, Typography } from '@mui/material'

type FaultConfigurationProps = {
  delayEnabled: boolean
  delayMs: number
  failureEnabled: boolean
  failureProbability: number
  onDelayEnabledChange: (enabled: boolean) => void
  onDelayChange: (delayMs: number) => void
  onFailureEnabledChange: (enabled: boolean) => void
  onFailureChange: (probability: number) => void
}

function FaultRow({
  title,
  description,
  enabled,
  onEnabledChange,
  children,
}: {
  title: string
  description: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Box sx={{ py: 1.8, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
        <FormControlLabel
          label={enabled ? 'Enabled' : 'Off'}
          control={<Switch size="small" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />}
          sx={{ m: 0, gap: 0.5, '& .MuiFormControlLabel-label': { color: 'text.secondary', fontSize: '0.72rem' } }}
        />
      </Stack>
      {enabled && <Box sx={{ mt: 1.6, maxWidth: 250 }}>{children}</Box>}
    </Box>
  )
}

export function FaultConfiguration({
  delayEnabled,
  delayMs,
  failureEnabled,
  failureProbability,
  onDelayEnabledChange,
  onDelayChange,
  onFailureEnabledChange,
  onFailureChange,
}: FaultConfigurationProps) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography variant="h3">Fault injection</Typography>
        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'secondary.main' }} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Apply controlled chaos to sandbox responses.
      </Typography>

      <FaultRow
        title="Artificial delay"
        description="Add a fixed delay before the sandbox responds."
        enabled={delayEnabled}
        onEnabledChange={onDelayEnabledChange}
      >
        <TextField
          label="Delay duration"
          type="number"
          size="small"
          fullWidth
          value={delayMs}
          onChange={(event) => onDelayChange(Number(event.target.value))}
          slotProps={{
            htmlInput: { min: 0, max: 10000, step: 50 },
            input: { endAdornment: <InputAdornment position="end">ms</InputAdornment> },
          }}
          helperText="Allowed range: 0–10,000 ms"
        />
      </FaultRow>

      <FaultRow
        title="Random failures"
        description="Inject HTTP 500 responses at a selected probability."
        enabled={failureEnabled}
        onEnabledChange={onFailureEnabledChange}
      >
        <TextField
          label="Failure probability"
          type="number"
          size="small"
          fullWidth
          value={failureProbability}
          onChange={(event) => onFailureChange(Number(event.target.value))}
          slotProps={{
            htmlInput: { min: 0, max: 1, step: 0.05 },
            input: { endAdornment: <InputAdornment position="end">0–1</InputAdornment> },
          }}
          helperText="0 = none · 1 = every request"
        />
      </FaultRow>
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Faults only affect the isolated sandbox endpoints—not external services.
        </Typography>
      </Box>
    </Box>
  )
}
