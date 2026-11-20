package sandbox

import "net/http"

type product struct {
	ID    int     `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Stock int     `json:"stock"`
}

var products = []product{
	{ID: 1, Name: "Mechanical Keyboard", Price: 89.99, Stock: 42},
	{ID: 2, Name: "USB-C Hub", Price: 34.50, Stock: 120},
	{ID: 3, Name: "27in Monitor", Price: 249.00, Stock: 15},
}

func Products(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": products})
}
