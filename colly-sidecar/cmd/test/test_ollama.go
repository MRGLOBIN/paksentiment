package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	url := "https://llm.h4mxa.com/api/generate"
	body, _ := json.Marshal(map[string]interface{}{
		"model":  "phi3:mini",
		"prompt": "Reply with only the word OK",
		"stream": false,
	})

	fmt.Printf("Testing Ollama at: %s\n", url)

	client := &http.Client{Timeout: 15 * time.Second}
	start := time.Now()

	resp, err := client.Post(url, "application/json", bytes.NewReader(body))
	elapsed := time.Since(start)

	if err != nil {
		fmt.Printf("ERROR after %v: %v\n", elapsed, err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("Status: %d (took %v)\n", resp.StatusCode, elapsed)

	respBody, _ := io.ReadAll(resp.Body)
	if len(respBody) > 300 {
		respBody = respBody[:300]
	}
	fmt.Printf("Response: %s\n", string(respBody))
}
