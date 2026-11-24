import { Alert, Box, Chip, Stack, Typography } from '@mui/material'
import type { SandboxEndpoint } from '../types'

type EndpointsPageProps = {
  endpoints: SandboxEndpoint[]
  loading: boolean
  error: string | null
}

export function EndpointsPage({ endpoints, loading, error }: EndpointsPageProps) {
  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="primary.main">SANDBOX / TARGETS</Typography>
          <Typography variant="h1" sx={{ mt: 0.6 }}>Endpoints</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Predefined targets available for isolated load and fault experiments.</Typography>
        </Box>

        {error && <Alert severity="error" variant="outlined">{error}</Alert>}
        {loading && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.5 }}>
            <Typography variant="body2" color="text.secondary">Loading sandbox endpoints…</Typography>
          </Box>
        )}
        {!loading && !error && endpoints.length === 0 && (
          <Box sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.5 }}>
            <Typography variant="body2" color="text.secondary">The backend did not return any sandbox endpoints.</Typography>
          </Box>
        )}
        {!loading && !error && endpoints.length > 0 && (
          <Stack spacing={1}>
            {endpoints.map((endpoint) => (
              <Box
                key={`${endpoint.method}-${endpoint.path}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '74px minmax(0, 1fr) auto' },
                  alignItems: 'center',
                  gap: 1.25,
                  px: 2,
                  py: 1.7,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  transition: 'border-color 150ms ease',
                  '&:hover': { borderColor: 'rgba(7,185,206,0.28)' },
                }}
              >
                <Chip label={endpoint.method} size="small" sx={{ width: 'fit-content', height: 22, bgcolor: 'rgba(7,185,206,0.10)', color: 'primary.main', fontFamily: 'monospace', fontSize: '0.64rem', fontWeight: 700 }} />
                <Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.86rem', color: 'text.primary' }}>{endpoint.path}</Typography>
                  <Typography variant="caption" color="text.secondary">{endpoint.description}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>SANDBOX</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
