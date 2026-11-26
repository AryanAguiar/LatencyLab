package api

import (
	"github.com/AryanAguiar/LatencyLab/backend/internal/sandbox"
	"github.com/go-chi/chi/v5"
)

// Mount registers the health check and all /api routes.
func Mount(r chi.Router, baseURL string, repositories ...ExperimentRepository) {
	var repository ExperimentRepository
	if len(repositories) > 0 {
		repository = repositories[0]
	}

	r.Get("/health", healthHandler)

	r.Route("/api", func(r chi.Router) {
		r.Post("/targets", createTargetHandler)
		r.Route("/v1", func(r chi.Router) {
			r.Get("/sandbox/endpoints", sandbox.ListEndpoints)
			r.Post("/experiments/run", runExperimentHandlerWithRepository(baseURL, repository))
			r.Get("/experiments", listExperimentsHandler(repository))
			r.Get("/experiments/{id}", getExperimentHandler(repository))
		})
	})
}
