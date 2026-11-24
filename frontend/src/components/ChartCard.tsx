import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'

type ChartCardProps = {
  title: string
  subtitle: string
  children: ReactNode
  action?: ReactNode
  minHeight?: number
}

export function ChartCard({ title, subtitle, children, action, minHeight = 284 }: ChartCardProps) {
  return (
    <Box
      sx={{
        minHeight,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start', p: 2, pb: 1.4 }}>
        <Box>
          <Typography variant="subtitle1">{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
        {action}
      </Stack>
      <Box sx={{ flex: 1, px: 2, pb: 2 }}>{children}</Box>
    </Box>
  )
}
