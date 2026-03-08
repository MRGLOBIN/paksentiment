package crawler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
)

// IsJSHeavy checks if a Colly-scraped page appears to be JavaScript-rendered
// and would benefit from a headless browser fallback.
func IsJSHeavy(r *models.PageResult) bool {
	text := r.Text

	// Heuristic 1: Very little text and very few links
	if len(text) < 100 && len(r.Links) < 10 {
		return true
	}

	// Heuristic 2: JS keywords in the extracted text
	jsKeywords := []string{
		"window.", "function(", "try{", "catch(e)",
		"_DumpException", ".prototype.", "addEventListener",
		"this.gbar_", "wiz_progress",
	}
	jsHits := 0
	sample := text
	if len(sample) > 3000 {
		sample = sample[:3000]
	}
	for _, kw := range jsKeywords {
		jsHits += strings.Count(sample, kw)
	}
	if jsHits > 5 {
		return true
	}

	// Heuristic 3: Almost no meaningful text after cleaning and no headlines
	if len(text) < 200 && len(r.Headlines) == 0 {
		return true
	}

	return false
}

// ScrapeWithScrapling calls the Python FastAPI /scrapling/fetch endpoint
// for pages that require a headless browser (JS-heavy sites).
func ScrapeWithScrapling(fastAPIBase, pageURL string) (*models.PageResult, error) {
	params := url.Values{}
	params.Set("url", pageURL)
	params.Set("follow_links", "false")
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("%s/scrapling/fetch?%s", fastAPIBase, params.Encode())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("scrapling request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("scrapling read body failed: %w", err)
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("scrapling returned status %d", resp.StatusCode)
	}

	var scraplingResp models.ScraplingResponse
	if err := json.Unmarshal(body, &scraplingResp); err != nil {
		return nil, fmt.Errorf("scrapling JSON decode failed: %w", err)
	}

	if len(scraplingResp.Results) == 0 {
		return nil, fmt.Errorf("scrapling returned no results")
	}

	sr := scraplingResp.Results[0]
	result := &models.PageResult{
		URL:       pageURL,
		Status:    resp.StatusCode,
		Title:     sr.Title,
		Text:      sr.Text,
		Links:     sr.Links,
		Engine:    "scrapling",
		Method:    "headless-browser",
		ScrapedAt: time.Now(),
	}

	return result, nil
}
