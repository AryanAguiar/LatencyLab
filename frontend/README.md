# LatencyLab frontend

LatencyLab is a dark-mode API load-testing and chaos-engineering interface built with React, TypeScript, Vite, and MUI Core.

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

Start the Go API from `backend` separately. The frontend defaults to `http://localhost:8080`; set `VITE_API_BASE_URL` to use a different backend origin.

## Frontend structure

- `src/App.tsx` owns page navigation and current-run state.
- `src/components/` contains the shared shell, runner controls, metric cards, and charts.
- `src/pages/` contains Overview, Experiment Runner, Results, and backend-driven Endpoints screens.
- `src/api/client.ts` validates and calls the health, endpoint catalog, and experiment APIs.
- `src/theme.ts` defines the dark MUI theme and brand tokens.

Compare and Settings are intentionally disabled until those features have working behavior.
