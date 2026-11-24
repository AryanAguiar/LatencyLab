import { Box, Button, Stack, Typography } from '@mui/material'
import type { AppPage, ConnectionStatus } from './AppLayout'

const pageLabels: Record<AppPage, string> = {
  overview: 'Overview',
  experiments: 'Experiments',
  results: 'Results',
  endpoints: 'Endpoints',
  compare: 'Compare',
  settings: 'Settings',
}

type TopbarProps = {
  page: AppPage
  onNavigate: (page: AppPage) => void
  connectionStatus: ConnectionStatus
}

export function Topbar({ page, onNavigate, connectionStatus }: TopbarProps) {
  const statusLabel = {
    checking: 'Checking API',
    connected: 'API connected',
    offline: 'API unreachable',
  }[connectionStatus]
  const statusColor = {
    checking: 'text.secondary',
    connected: 'success.main',
    offline: 'error.main',
  }[connectionStatus]

  return (
    <Box
      component="header"
      sx={{
        height: 58,
        px: { xs: 2, md: 3.5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'rgba(8,13,20,0.88)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">Workspace</Typography>
        <Typography variant="body2" color="text.secondary">/</Typography>
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 550 }}>{pageLabels[page]}</Typography>
      </Stack>
      <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor }} />
          <Typography variant="caption" color={statusColor} sx={{ display: { xs: 'none', sm: 'block' } }}>
            {statusLabel}
          </Typography>
        </Stack>
        <Button
          onClick={() => onNavigate('experiments')}
          size="small"
          variant="contained"
          color="primary"
          startIcon={
            <Box component="svg" viewBox="0 0 20 20" aria-hidden="true" sx={{ width: 15, height: 15 }}>
              <path d="M7 4.5v11l8-5.5-8-5.5z" fill="currentColor" />
            </Box>
          }
          sx={{ px: 1.4, minHeight: 32, fontSize: '0.76rem' }}
        >
          Run experiment
        </Button>
      </Stack>
    </Box>
  )
}
