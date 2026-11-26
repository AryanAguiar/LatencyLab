package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/AryanAguiar/LatencyLab/backend/internal/api"
	"github.com/AryanAguiar/LatencyLab/backend/internal/faults"
	"github.com/AryanAguiar/LatencyLab/backend/internal/sandbox"
	"github.com/AryanAguiar/LatencyLab/backend/internal/storage"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
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
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	if err := loadDotEnv(); err != nil {
		return err
	}

	port := getEnv("PORT", "8080")
	r := chi.NewRouter()

	dbCtx, cancelDBConnect := context.WithTimeout(context.Background(), 10*time.Second)
	pool, err := storage.OpenPostgresPool(dbCtx)
	cancelDBConnect()
	if err != nil {
		return err
	}
	defer pool.Close()
	experimentRepository := storage.NewExperimentRepository(pool)

	testFaults := faults.Config{DelayMs: 200, FailureProbability: 0.3}
	if err := testFaults.Validate(); err != nil {
		return err
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

	api.Mount(r, getEnv("BACKEND_URL", "http://localhost:"+port), experimentRepository)

	r.Route("/sandbox/api", func(r chi.Router) {
		r.Use(faults.Middleware(testFaults))
		sandbox.Routes(r)
	})

	srv := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      6 * time.Minute,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func loadDotEnv() error {
	candidates := []string{
		".env",
		filepath.Join("backend", ".env"),
		filepath.Join("..", ".env"),
		filepath.Join("..", "..", ".env"),
		filepath.Join("..", "..", "..", ".env"),
	}
	for _, path := range candidates {
		err := godotenv.Load(path)
		if err == nil {
			log.Printf("loaded env from %s", path)
			return nil
		}
		if !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("load %s: %w", path, err)
		}
	}
	return nil
}
