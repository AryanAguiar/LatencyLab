import { Box, ButtonBase, Chip, Stack, Typography } from '@mui/material'
import type { AppPage, ConnectionStatus } from './AppLayout'

type SidebarProps = {
  page: AppPage
  onNavigate: (page: AppPage) => void
  connectionStatus: ConnectionStatus
}

const items: { id: AppPage; label: string; icon: string; disabled?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: 'M3 3h7v7H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 14h7v7H3z' },
  { id: 'experiments', label: 'Experiments', icon: 'M9 3h6 M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3 M7 16h10' },
  { id: 'compare', label: 'Compare', icon: 'M4 19V5 M4 19h17 M8 15l3-4 3 2 5-7' },
  { id: 'endpoints', label: 'Endpoints', icon: 'M4 6h16 M4 12h16 M4 18h16 M8 6v.01 M8 12v.01 M8 18v.01' },
  // { id: 'settings', label: 'Settings', icon: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.6 2.77-.08-.02a1.7 1.7 0 0 0-1.8.49l-.06.06h-3.2l-.04-.08a1.7 1.7 0 0 0-1.55-1.03 1.7 1.7 0 0 0-.78.19l-.08.04-2.77-1.6.02-.08a1.7 1.7 0 0 0-.49-1.8l-.06-.06v-3.2l.08-.04a1.7 1.7 0 0 0 .84-2.33l-.04-.08 1.6-2.77.08.02a1.7 1.7 0 0 0 1.8-.49l.06-.06h3.2l.04.08a1.7 1.7 0 0 0 2.33.84l.08-.04 2.77 1.6-.02.08a1.7 1.7 0 0 0 .49 1.8l.06.06v3.2l-.08.04a1.7 1.7 0 0 0-.45.45z', disabled: true },
]

function NavigationGlyph({ path }: { path: string }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden="true" sx={{ width: 18, height: 18, flexShrink: 0 }}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  )
}

export function Sidebar({ page, onNavigate, connectionStatus }: SidebarProps) {
  const connectionLabel = {
    checking: 'Checking backend…',
    connected: 'Backend connected',
    offline: 'Backend unreachable',
  }[connectionStatus]
  const connectionColor = {
    checking: 'text.secondary',
    connected: 'success.main',
    offline: 'error.main',
  }[connectionStatus]

  return (
    <Box
      component="aside"
      sx={{
        width: 232,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: '#0A1018',
        display: 'flex',
        flexDirection: 'column',
        px: 1.5,
        py: 2,
        '@media (max-width: 760px)': {
          width: '100%',
          borderRight: 0,
          borderBottom: '1px solid',
          px: 1.25,
          py: 1,
        },
      }}
    >
      <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', px: 1, pb: 3, pt: 0.5, '@media (max-width: 760px)': { pb: 1 } }}>
        <Box
          sx={{
            width: 31,
            height: 31,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid rgba(7,185,206,0.42)',
            borderRadius: 1,
            color: 'primary.main',
            bgcolor: 'rgba(7,185,206,0.08)',
          }}
        >
          <Box component="svg" viewBox="0 0 24 24" aria-hidden="true" sx={{ width: 20, height: 20 }}>
            <path d="M3 13h4l2.2-6 4.1 11 2.2-5H21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            Latency<span style={{ color: '#07B9CE' }}>Lab</span>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', letterSpacing: '0.08em' }}>
            CHAOS ENGINEERING
          </Typography>
        </Box>
      </Stack>

      <Typography variant="overline" color="text.secondary" sx={{ px: 1.25, mb: 0.8, '@media (max-width: 760px)': { display: 'none' } }}>
        WORKSPACE
      </Typography>
      <Stack
        component="nav"
        aria-label="Main navigation"
        spacing={0.45}
        sx={{
          '@media (max-width: 760px)': {
            flexDirection: 'row',
            overflowX: 'auto',
            gap: 0.5,
            pb: 0.25,
            '&::-webkit-scrollbar': { display: 'none' },
          },
        }}
      >
        {items.map((item) => {
          const active = page === item.id
          return (
            <ButtonBase
              key={item.id}
              disabled={item.disabled}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              sx={{
                minHeight: 39,
                width: '100%',
                justifyContent: 'flex-start',
                gap: 1.25,
                px: 1.25,
                borderRadius: 1,
                color: active ? '#DFFBFF' : 'text.secondary',
                bgcolor: active ? 'rgba(7,185,206,0.10)' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'rgba(7,185,206,0.17)' : 'transparent',
                transition: 'background-color 140ms ease, color 140ms ease, border-color 140ms ease',
                '&:hover': { bgcolor: active ? 'rgba(7,185,206,0.13)' : 'rgba(255,255,255,0.035)', color: 'text.primary' },
                '&.Mui-disabled': { opacity: 0.48, color: 'text.secondary' },
                '@media (max-width: 760px)': { width: 'auto', minWidth: 'max-content', minHeight: 36, px: 1 },
              }}
            >
              <NavigationGlyph path={item.icon} />
              <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: active ? 600 : 500 }}>
                {item.label}
              </Typography>
              {item.disabled && (
                <Chip label="LATER" size="small" sx={{ ml: 'auto', height: 18, fontSize: '0.56rem', color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.045)', '@media (max-width: 760px)': { display: 'none' } }} />
              )}
            </ButtonBase>
          )
        })}
      </Stack>

      {/* <Box sx={{ mt: 'auto', pt: 2, '@media (max-width: 760px)': { display: 'none' } }}>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.75, px: 1 }}>
          <Typography variant="overline" color="text.secondary">SANDBOX ENVIRONMENT</Typography>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 0.7 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: connectionColor }} />
            <Typography variant="caption" color={connectionColor}>{connectionLabel}</Typography>
          </Stack>
        </Box>
      </Box> */}
    </Box>
  )
}
