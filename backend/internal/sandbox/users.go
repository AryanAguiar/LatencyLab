package sandbox

import "net/http"

type user struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

var users = []user{
	{ID: 1, Name: "Asha Rao", Email: "asha@example.com", Role: "admin"},
	{ID: 2, Name: "Ben Carter", Email: "ben@example.com", Role: "customer"},
	{ID: 3, Name: "Chen Wei", Email: "chen@example.com", Role: "customer"},
}

func Users(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": users})
}
