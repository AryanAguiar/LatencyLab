import { lazy, Suspense, useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { checkHealth, getSandboxEndpoints, runExperiment } from './api/client'
import type { ConnectionStatus, AppPage } from './components/AppLayout'
import { AppLayout } from './components/AppLayout'
import type { ExperimentConfig, ExperimentResponse, SandboxEndpoint } from './types'
import type { ExecutionStatus } from './components/ExperimentStatus'

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const ExperimentRunnerPage = lazy(() => import('./pages/ExperimentRunnerPage').then((module) => ({ default: module.ExperimentRunnerPage })))
const ExperimentResultsPage = lazy(() => import('./pages/ExperimentResultsPage').then((module) => ({ default: module.ExperimentResultsPage })))
const EndpointsPage = lazy(() => import('./pages/EndpointsPage').then((module) => ({ default: module.EndpointsPage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then((module) => ({ default: module.ComparePage })))

function App() {
  const [page, setPage] = useState<AppPage>('overview')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking')
  const [endpoints, setEndpoints] = useState<SandboxEndpoint[]>([])
  const [endpointsLoading, setEndpointsLoading] = useState(true)
  const [endpointsError, setEndpointsError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ExperimentResponse | null>(null)
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle')
  const [executionError, setExecutionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const refreshHealth = () => {
      checkHealth()
        .then(() => { if (active) setConnectionStatus('connected') })
        .catch(() => { if (active) setConnectionStatus('offline') })
    }
    refreshHealth()
    getSandboxEndpoints()
      .then((data) => {
        if (active) setEndpoints(data)
      })
      .catch((error: unknown) => {
        if (active) setEndpointsError(error instanceof Error ? error.message : 'Unable to load sandbox endpoints.')
      })
      .finally(() => { if (active) setEndpointsLoading(false) })
    const healthInterval = window.setInterval(refreshHealth, 30_000)
    return () => {
      active = false
      window.clearInterval(healthInterval)
    }
  }, [])

  function navigate(destination: AppPage) {
    if (destination === 'experiments' && page !== 'experiments') {
      setExecutionStatus('idle')
      setExecutionError(null)
    }
    setPage(destination)
  }

  async function handleRun(config: ExperimentConfig) {
    setExecutionStatus('running')
    setExecutionError(null)
    try {
      const result = await runExperiment(config)
      setLastResult(result)
      setExecutionStatus('completed')
      setPage('results')
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : 'The experiment could not be completed.')
      setExecutionStatus('error')
    }
  }

  return (
    <AppLayout page={page} onNavigate={navigate} connectionStatus={connectionStatus}>
      <Suspense fallback={<Box sx={{ minHeight: 280, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>}>
        {page === 'overview' && <OverviewPage result={lastResult} connectionStatus={connectionStatus} onRun={() => navigate('experiments')} />}
        {page === 'experiments' && <ExperimentRunnerPage status={executionStatus} endpoints={endpoints} endpointsLoading={endpointsLoading} endpointsError={endpointsError} error={executionError} onRun={handleRun} onViewResults={() => setPage('results')} />}
        {page === 'results' && <ExperimentResultsPage result={lastResult} onNewExperiment={() => navigate('experiments')} />}
        {page === 'endpoints' && <EndpointsPage endpoints={endpoints} loading={endpointsLoading} error={endpointsError} />}
        {page === 'compare' && <ComparePage />}
      </Suspense>
    </AppLayout>
  )
}

export default App
