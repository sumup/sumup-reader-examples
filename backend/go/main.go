package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"os"
	"strings"

	"github.com/sumup/sumup-go"
	sumupclient "github.com/sumup/sumup-go/client"
	"github.com/sumup/sumup-go/readers"
)

type createReaderRequest struct {
	PairingCode string `json:"pairing_code"`
	Name        string `json:"name"`
}

type createReaderCheckoutRequest struct {
	Amount float64 `json:"amount"`
}

func main() {
	apiKey := os.Getenv("SUMUP_API_KEY")
	merchantCode := os.Getenv("SUMUP_MERCHANT_CODE")
	if apiKey == "" {
		log.Fatal("Missing SUMUP_API_KEY env var.")
	}
	if merchantCode == "" {
		log.Fatal("Missing SUMUP_MERCHANT_CODE env var.")
	}

	client := sumup.NewClient(sumupclient.WithAPIKey(apiKey))

	http.HandleFunc("/readers", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			readersResponse, err := client.Readers.List(r.Context(), merchantCode)
			if err != nil {
				log.Printf("[ERROR] list readers: %v", err)
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list readers"})
				return
			}

			writeJSON(w, http.StatusOK, readersResponse)
		case http.MethodPost:
			var payload createReaderRequest
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
				return
			}

			pairingCode := strings.TrimSpace(payload.PairingCode)
			name := strings.TrimSpace(payload.Name)
			if pairingCode == "" || name == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "pairing_code and name are required"})
				return
			}

			reader, err := client.Readers.Create(r.Context(), merchantCode, readers.Create{
				PairingCode: readers.ReaderPairingCode(pairingCode),
				Name:        readers.ReaderName(name),
			})
			if err != nil {
				log.Printf("[ERROR] create reader: %v", err)
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create reader"})
				return
			}

			writeJSON(w, http.StatusCreated, reader)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	})

	http.HandleFunc("/readers/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/readers/")
		parts := strings.Split(path, "/")
		if len(parts) != 2 || parts[1] != "checkout" {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		readerID := strings.TrimSpace(parts[0])
		if readerID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "readerId is required"})
			return
		}

		var payload createReaderCheckoutRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
			return
		}

		if payload.Amount <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "amount must be a positive number"})
			return
		}

		checkout, err := client.Readers.CreateCheckout(r.Context(), merchantCode, readerID, readers.CreateCheckout{
			Description: ptr("Card reader checkout"),
			TotalAmount: readers.CreateCheckoutTotalAmount{
				Currency:  "EUR",
				MinorUnit: 2,
				Value:     int(math.Round(payload.Amount * 100)),
			},
		})
		if err != nil {
			log.Printf("[ERROR] create reader checkout: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create reader checkout"})
			return
		}

		writeJSON(w, http.StatusCreated, checkout)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Go server listening on http://localhost:%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func ptr(value string) *string {
	return &value
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
