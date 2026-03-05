package sentiment

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
)

// OllamaAnalyzer handles sentiment analysis via an Ollama LLM instance.
type OllamaAnalyzer struct {
	url    string
	model  string
	client *http.Client
}

// NewOllamaAnalyzer creates a new analyzer pointing at the Ollama server.
func NewOllamaAnalyzer(url, model string) *OllamaAnalyzer {
	return &OllamaAnalyzer{
		url:   url,
		model: model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ollamaRequest is the JSON body sent to Ollama /api/generate.
type ollamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

// ollamaResponse is the JSON body returned from Ollama /api/generate.
type ollamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// sentimentJSON is the expected structured output from the LLM.
type sentimentJSON struct {
	Sentiment  string  `json:"sentiment"`
	Confidence float64 `json:"confidence"`
	Topic      string  `json:"topic"`
	Summary    string  `json:"summary"`
}

// IsAvailable checks if the Ollama server is reachable with a quick ping.
func (o *OllamaAnalyzer) IsAvailable() bool {
	pingClient := &http.Client{Timeout: 15 * time.Second}

	body, _ := json.Marshal(ollamaRequest{
		Model:  o.model,
		Prompt: "Reply with only the word OK",
		Stream: false,
	})

	endpoint := o.url + "/api/generate"
	log.Printf("[Sentiment] Pinging Ollama at %s (model: %s)", endpoint, o.model)

	resp, err := pingClient.Post(endpoint, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("[Sentiment] Ollama health check failed: %v", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("[Sentiment] Ollama health check returned status %d", resp.StatusCode)
		return false
	}

	var result ollamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("[Sentiment] Ollama health check decode failed: %v", err)
		return false
	}

	log.Printf("[Sentiment] Ollama health check OK — model %s is ready", o.model)
	return result.Done
}

// AnalyzePages runs sentiment analysis on each PageResult using the Ollama model.
// It modifies the results in-place, filling in Sentiment/Confidence/Summary fields.
// Returns true if sentiment was successfully applied to at least one page.
func (o *OllamaAnalyzer) AnalyzePages(results []models.PageResult) bool {
	if len(results) == 0 {
		return false
	}

	anySuccess := false
	for i := range results {
		if len(results[i].Text) < 50 {
			// Skip pages with too little text
			continue
		}

		sentiment, confidence, topic, summary, err := o.analyzeSingle(results[i].Text)
		if err != nil {
			log.Printf("[Sentiment] Ollama failed for %s: %v", results[i].URL, err)
			continue
		}

		results[i].Sentiment = sentiment
		results[i].Confidence = confidence
		results[i].Topic = topic
		results[i].Summary = summary
		results[i].SentimentEngine = "ollama:" + o.model
		anySuccess = true

		log.Printf("[Sentiment] %s → %s (%.2f) [%s] via %s", results[i].URL, sentiment, confidence, topic, o.model)
	}

	return anySuccess
}

// analyzeSingle sends a single text to Ollama and parses the sentiment response.
func (o *OllamaAnalyzer) analyzeSingle(text string) (string, float64, string, string, error) {
	// Truncate text to avoid overwhelming the LLM
	if len(text) > 1500 {
		text = text[:1500]
	}

	prompt := buildPrompt(text)

	reqBody, _ := json.Marshal(ollamaRequest{
		Model:  o.model,
		Prompt: prompt,
		Stream: false,
	})

	resp, err := o.client.Post(o.url+"/api/generate", "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return "", 0, "", "", fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, "", "", fmt.Errorf("read response failed: %w", err)
	}

	if resp.StatusCode != 200 {
		return "", 0, "", "", fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	var ollamaResp ollamaResponse
	if err := json.Unmarshal(respBody, &ollamaResp); err != nil {
		return "", 0, "", "", fmt.Errorf("JSON decode failed: %w", err)
	}

	raw := ollamaResp.Response

	// Try to extract JSON from the response
	jsonRegex := regexp.MustCompile(`\{[\s\S]*?\}`)
	match := jsonRegex.FindString(raw)
	if match != "" {
		var parsed sentimentJSON
		if err := json.Unmarshal([]byte(match), &parsed); err == nil {
			confidence := parsed.Confidence
			if confidence < 0 {
				confidence = 0
			}
			if confidence > 1 {
				confidence = 1
			}
			topic := parsed.Topic
			if topic == "" {
				topic = "General"
			}
			return parsed.Sentiment, confidence, topic, parsed.Summary, nil
		}
	}

	// Fallback: keyword detection
	lower := strings.ToLower(raw)
	sentiment := "Neutral"
	confidence := 0.5
	if strings.Contains(lower, "positive") {
		sentiment = "Positive"
		confidence = 0.7
	} else if strings.Contains(lower, "negative") {
		sentiment = "Negative"
		confidence = 0.7
	}

	summary := raw
	if len(summary) > 300 {
		summary = summary[:300]
	}

	return sentiment, confidence, "General", strings.TrimSpace(summary), nil
}

// buildPrompt creates a structured prompt for sentiment analysis with topic extraction.
func buildPrompt(text string) string {
	return fmt.Sprintf(`You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).

Classify the sentiment as one of: Positive, Negative, Neutral
Identify the main topic as a single word (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law).
Write a concise summary of 3-4 sentences that captures the key points for a content preview.

Respond in this exact JSON format:
{"sentiment": "<category>", "confidence": <0.0 to 1.0>, "topic": "<single word topic>", "summary": "<3-4 sentence summary>"}

Text to analyze:
"""%s"""

JSON response:`, text)
}
