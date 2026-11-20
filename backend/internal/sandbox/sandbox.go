package sandbox

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type Endpoint struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Description string `json:"description"`
}

var endpoints = []Endpoint{
	{Method: "GET", Path: "/sandbox/api/products", Description: "Simulated products response"},
	{Method: "GET", Path: "/sandbox/api/users", Description: "Simulated users response"},
	{Method: "GET", Path: "/sandbox/api/orders", Description: "Simulated orders response"},
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode error: %v", err)
	}
}

func ListEndpoints(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": endpoints})
}

// Routes registers the sandbox handlers on any router, so callers can
// mount them under different prefixes or wrap them in middleware.
func Routes(r chi.Router) {
	r.Get("/products", Products)
	r.Get("/users", Users)
	r.Get("/orders", Orders)
}
