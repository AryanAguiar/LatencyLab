package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/api"
	"github.com/AryanAguiar/LatencyLab/backend/internal/faults"
	"github.com/AryanAguiar/LatencyLab/backend/internal/sandbox"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// helpers
func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ---------------------------------------------------------------------
// main
func main() {
	port := getEnv("PORT", "8080")
	r := chi.NewRouter()

	testFaults := faults.Config{DelayMs: 200, FailureProbability: 0.3}
	if err := testFaults.Validate(); err != nil {
		log.Fatalf("invalid fault config: %v", err)
	}

	frontendOrigin := getEnv("FRONTEND_ORIGIN", "http://localhost:5173")
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello"))
	})

	api.Mount(r, getEnv("BACKEND_URL", "http://localhost:"+port))

	r.Route("/sandbox/api", func(r chi.Router) {
		r.Use(faults.Middleware(testFaults))
		sandbox.Routes(r)
	})

	srv := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("listening on %s", srv.Addr)
	log.Fatal(srv.ListenAndServe())
}
