import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import type { ExperimentConfig, SandboxEndpoint } from '../types'
import { ExperimentForm } from '../components/ExperimentForm'
import { ExperimentStatus, type ExecutionStatus } from '../components/ExperimentStatus'

type ExperimentRunnerPageProps = {
  status: ExecutionStatus
  endpoints: SandboxEndpoint[]
  endpointsLoading: boolean
  endpointsError: string | null
  error?: string | null
  onRun: (config: ExperimentConfig) => void
  onViewResults?: () => void
}

export function ExperimentRunnerPage({ status, endpoints, endpointsLoading, endpointsError, error, onRun, onViewResults }: ExperimentRunnerPageProps) {
  return (
    <Box sx={{ maxWidth: 1260, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}>
          <Box>
            <Typography variant="overline" color="primary.main">EXPERIMENTS / NEW RUN</Typography>
            <Typography variant="h1" sx={{ mt: 0.6 }}>Configure a run</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Control the load profile. Then introduce faults, one variable at a time.</Typography>
          </Box>
          <Chip label="SANDBOX ONLY" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, borderColor: 'rgba(7,185,206,0.3)', color: 'primary.main', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em' }} />
        </Stack>

        {endpointsError && <Alert severity="error" variant="outlined">{endpointsError}</Alert>}
        {!endpointsError && endpointsLoading && <Typography variant="caption" color="text.secondary">Loading sandbox endpoint catalog…</Typography>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.5fr) minmax(280px, 0.75fr)' }, gap: 1.5, alignItems: 'start' }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2, md: 2.5 } }}>
            <ExperimentForm endpoints={endpoints} disabled={status === 'running' || endpointsLoading || !!endpointsError} onSubmit={onRun} />
          </Box>
          <Stack spacing={1.5}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
              <Typography variant="overline" color="text.secondary">EXECUTION</Typography>
              <Box sx={{ mt: 1.3 }}>
                <ExperimentStatus status={status} error={error} onViewResults={onViewResults} />
              </Box>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
              <Typography variant="overline" color="text.secondary">SAFEGUARDS</Typography>
              <Stack spacing={1.3} sx={{ mt: 1.4 }}>
                {[
                  ['Request cap', '100 per experiment'],
                  ['Concurrency cap', '10 workers'],
                  ['Fault scope', 'Sandbox endpoints only'],
                  // ['Execution time', '25-second server limit'],
                ].map(([label, value]) => (
                  <Stack key={label} direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.primary', textAlign: 'right' }}>{value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}
