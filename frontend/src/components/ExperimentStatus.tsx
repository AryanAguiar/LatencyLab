import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'

export type ExecutionStatus = 'idle' | 'running' | 'error' | 'completed'

type ExperimentStatusProps = {
  status: ExecutionStatus
  error?: string | null
  onViewResults?: () => void
}

export function ExperimentStatus({ status, error, onViewResults }: ExperimentStatusProps) {
  if (status === 'idle') {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', py: 1.5, px: 1.75, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,0.015)' }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'text.secondary' }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Ready to run</Typography>
          <Typography variant="caption" color="text.secondary">Configure the profile, then start the experiment.</Typography>
        </Box>
      </Stack>
    )
  }

  if (status === 'running') {
    return (
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', py: 1.5, px: 1.75, border: '1px solid rgba(7,185,206,0.25)', bgcolor: 'rgba(7,185,206,0.045)' }}>
        <CircularProgress size={18} thickness={5} color="primary" />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Experiment in progress</Typography>
          <Typography variant="caption" color="text.secondary">Sending sandbox requests and collecting response metrics.</Typography>
        </Box>
      </Stack>
    )
  }

  if (status === 'error') {
    return <Alert severity="error" variant="outlined">{error || 'The experiment could not be completed.'}</Alert>
  }

  return (
    <Alert
      severity="success"
      variant="outlined"
      action={onViewResults ? <Button color="inherit" size="small" onClick={onViewResults}>View results</Button> : undefined}
    >
      Experiment completed. Results are ready to inspect.
    </Alert>
  )
}
