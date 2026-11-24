import { Box, Stack, Typography } from '@mui/material'

type MetricCardProps = {
  label: string
  value: string
  unit?: string
  detail: string
  tone?: 'cyan' | 'blue' | 'violet' | 'neutral'
}

const tones = {
  cyan: '#07B9CE',
  blue: '#5E87F5',
  violet: '#A77AF0',
  neutral: '#8493A5',
}

export function MetricCard({ label, value, unit, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <Box
      sx={{
        minHeight: 128,
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:hover': { borderColor: 'rgba(7,185,206,0.28)', transform: 'translateY(-1px)' },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          width: 2,
          height: 28,
          bgcolor: tones[tone],
          opacity: 0.8,
        },
      }}
    >
      <Stack spacing={1.4}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.035em' }}>
          {label}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
          <Typography sx={{ fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-0.055em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </Typography>
          {unit && <Typography variant="caption" color="text.secondary">{unit}</Typography>}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {detail}
        </Typography>
      </Stack>
    </Box>
  )
}
