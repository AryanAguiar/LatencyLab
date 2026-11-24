package api

import (
	"github.com/AryanAguiar/LatencyLab/backend/internal/sandbox"
	"github.com/go-chi/chi/v5"
)

// Mount registers the health check and all /api routes.
func Mount(r chi.Router, baseURL string) {
	r.Get("/health", healthHandler)

	r.Route("/api", func(r chi.Router) {
		r.Post("/targets", createTargetHandler)
		r.Route("/v1", func(r chi.Router) {
			r.Get("/sandbox/endpoints", sandbox.ListEndpoints)
			r.Post("/experiments/run", runExperimentHandler(baseURL))
		})
	})
}
