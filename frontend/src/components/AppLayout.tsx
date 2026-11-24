import type { ReactNode } from 'react'
import { Box } from '@mui/material'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export type AppPage = 'overview' | 'experiments' | 'results' | 'endpoints' | 'compare' | 'settings'
export type ConnectionStatus = 'checking' | 'connected' | 'offline'

type AppLayoutProps = {
  page: AppPage
  onNavigate: (page: AppPage) => void
  connectionStatus: ConnectionStatus
  children: ReactNode
}

export function AppLayout({ page, onNavigate, connectionStatus, children }: AppLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
        '@media (max-width: 760px)': { flexDirection: 'column' },
      }}
    >
      <Sidebar page={page} onNavigate={onNavigate} connectionStatus={connectionStatus} />
      <Box component="main" sx={{ minWidth: 0, flex: 1, width: { xs: '100%', md: 'auto' } }}>
        <Topbar page={page} onNavigate={onNavigate} connectionStatus={connectionStatus} />
        {children}
      </Box>
    </Box>
  )
}
