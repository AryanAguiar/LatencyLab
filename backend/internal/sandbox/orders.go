package sandbox

import "net/http"

type order struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	ProductID int    `json:"product_id"`
	Quantity  int    `json:"quantity"`
	Status    string `json:"status"`
}

var orders = []order{
	{ID: 101, UserID: 2, ProductID: 1, Quantity: 1, Status: "shipped"},
	{ID: 102, UserID: 3, ProductID: 2, Quantity: 3, Status: "pending"},
	{ID: 103, UserID: 2, ProductID: 3, Quantity: 1, Status: "delivered"},
}

func Orders(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"data": orders})
}
