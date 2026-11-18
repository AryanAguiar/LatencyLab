package main

import (
	"encoding/json"
	"errors"
	"io"
	"strings"

	"log"
	"net/http"
	"os"
	"time"

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

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode error: %v", err)
	}
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB limit
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("body must contain a single JSON object")
	}
	return nil
}

type createTargetRequest struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

func createTargetHandler(w http.ResponseWriter, r *http.Request) {
	var req createTargetRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error(), nil)
		return
	}
	if errs := req.validate(); len(errs) > 0 {
		writeError(w, http.StatusUnprocessableEntity, "validation failed", errs)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":   "tgt_1", // placeholder
		"name": req.Name,
		"url":  req.URL,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type errorResponse struct {
	Error  string            `json:"error"`
	Fields map[string]string `json:"fields,omitempty"`
}

func writeError(w http.ResponseWriter, status int, msg string, fields map[string]string) {
	writeJSON(w, status, errorResponse{Error: msg, Fields: fields})
}

func (r createTargetRequest) validate() map[string]string {
	errs := map[string]string{}
	if strings.TrimSpace(r.Name) == "" {
		errs["name"] = "is required"
	}
	if !strings.HasPrefix(r.URL, "http://") && !strings.HasPrefix(r.URL, "https://") {
		errs["url"] = "must start with http:// or https://"
	}
	return errs
}

// ---------------------------------------------------------------------
// sandbox
type product struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

type user struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type order struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	ProductID int    `json:"product_id"`
	Quantity  int    `json:"quantity"`
	Status    string `json:"status"`
}

type sandboxEndpoint struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Description string `json:"description"`
}

var (
	sandboxProducts = []product{
		{ID: 1, Name: "Mechanical Keyboard", Price: 89.99, Stock: 42},
		{ID: 2, Name: "USB-C Hub", Price: 34.50, Stock: 120},
		{ID: 3, Name: "27in Monitor", Price: 249.00, Stock: 15},
	}
	sandboxUsers = []user{
		{ID: 1, Name: "Asha Rao", Email: "asha@example.com", Role: "admin"},
		{ID: 2, Name: "Ben Carter", Email: "ben@example.com", Role: "customer"},
		{ID: 3, Name: "Chen Wei", Email: "chen@example.com", Role: "customer"},
	}
	sandboxOrders = []order{
		{ID: 101, UserID: 2, ProductID: 1, Quantity: 1, Status: "shipped"},
		{ID: 102, UserID: 3, ProductID: 2, Quantity: 3, Status: "pending"},
		{ID: 103, UserID: 2, ProductID: 3, Quantity: 1, Status: "delivered"},
	}
	sandboxEndpoints = []sandboxEndpoint{
		{Method: "GET", Path: "/sandbox/api/products", Description: "Simulated products response"},
		{Method: "GET", Path: "/sandbox/api/users", Description: "Simulated users response"},
		{Method: "GET", Path: "/sandbox/api/orders", Description: "Simulated orders response"},
	}
)

func listSandboxEndpointsHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": sandboxEndpoints})
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": sandboxProducts})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": sandboxUsers})
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": sandboxOrders})
}

// ---------------------------------------------------------------------
// main
func main() {
	port := getEnv("PORT", "8080")
	r := chi.NewRouter()

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

	r.Get("/health", healthHandler)

	r.Route("/api", func(r chi.Router) {
		r.Post("/targets", createTargetHandler)
		r.Route("/v1", func(r chi.Router) {
			r.Get("/sandbox/endpoints", listSandboxEndpointsHandler)
		})
	})

	r.Route("/sandbox/api", func(r chi.Router) {
		r.Get("/products", productsHandler)
		r.Get("/users", usersHandler)
		r.Get("/orders", ordersHandler)
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
