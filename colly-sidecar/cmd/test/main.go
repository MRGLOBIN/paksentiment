package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gocolly/colly/v2"
	"github.com/paksentiment/colly-sidecar/crawler"
)

// TestResult holds the scraping result for a single URL.
type TestResult struct {
	URL       string
	Title     string
	TextLen   int
	Text      string
	Headlines []string
	Links     int
	Duration  time.Duration
	Status    int
	Engine    string // "colly" or "scrapling"
	Method    string // "readability" or "css-selectors"
	JSHeavy   bool
	Error     string
}

// ScraplingResponse matches the FastAPI /scrapling/fetch JSON.
type ScraplingResponse struct {
	Results []struct {
		URL   string   `json:"url"`
		Title string   `json:"title"`
		Text  string   `json:"text"`
		Links []string `json:"links"`
	} `json:"results"`
	Count int `json:"count"`
}

const fastAPIBase = "http://localhost:8000"

func main() {
	outputFile := "clean_test_results.txt"

	testURLs := []struct {
		Name string
		URL  string
	}{
		{"Google News (Main)", "https://news.google.com"},
		{"Google News (Pakistan)", "https://news.google.com/search?q=Pakistan"},
		{"Google News (Technology)", "https://news.google.com/search?q=technology"},
		{"Wikipedia (Main)", "https://en.wikipedia.org/wiki/Main_Page"},
		{"Wikipedia (Pakistan)", "https://en.wikipedia.org/wiki/Pakistan"},
		{"Wikipedia Search (Sentiment Analysis)", "https://en.wikipedia.org/w/index.php?search=sentiment+analysis"},
		{"Wikipedia (Natural Language Processing)", "https://en.wikipedia.org/wiki/Natural_language_processing"},
		{"Wikipedia (Web Scraping)", "https://en.wikipedia.org/wiki/Web_scraping"},
		// Generic websites (will use Readability)
		{"Python Docs (What's New)", "https://docs.python.org/3/whatsnew/3.12.html"},
		{"Hacker News", "https://news.ycombinator.com"},
		{"Al Jazeera Article", "https://www.aljazeera.com/news"},
	}

	var results []TestResult
	totalStart := time.Now()

	fmt.Println("🔧 CLEAN CONTENT EXTRACTION TEST (Smart Selectors)")
	fmt.Println("===================================================")
	fmt.Printf("Start: %s\n\n", totalStart.Format(time.RFC3339))

	// Check if FastAPI is reachable
	fastAPIAvailable := checkFastAPI()
	if fastAPIAvailable {
		fmt.Println("✅ FastAPI/Scrapling gateway is reachable — JS fallback enabled")
	} else {
		fmt.Println("⚠️  FastAPI/Scrapling gateway NOT reachable — JS fallback will be skipped")
	}
	fmt.Println()

	for i, test := range testURLs {
		fmt.Printf("[%d/%d] %s\n", i+1, len(testURLs), test.Name)

		// Step 1: Try Colly with smart extraction
		result := scrapeWithColly(test.URL)
		fmt.Printf("   Colly [%s]: %d clean chars | %d links | %d headlines | %v",
			result.Method, result.TextLen, result.Links, len(result.Headlines), result.Duration)

		// Step 2: Detect if page is JS-heavy
		if isJSHeavy(result) {
			result.JSHeavy = true
			fmt.Printf(" ⚠️  JS-HEAVY")

			if fastAPIAvailable {
				fmt.Printf("\n   🔄 Falling back to Scrapling...")
				fallback := scrapeWithScrapling(test.URL)
				if fallback.Error == "" {
					fmt.Printf(" ✅ %d chars | %d links | %v\n", fallback.TextLen, fallback.Links, fallback.Duration)
					fallback.JSHeavy = true
					results = append(results, result)
					results = append(results, fallback)
					continue
				} else {
					fmt.Printf(" ❌ %s\n", fallback.Error)
				}
			} else {
				fmt.Printf(" (no fallback)\n")
			}
		} else {
			fmt.Printf(" ✅ CLEAN\n")
		}
		results = append(results, result)
	}

	// Deep crawl
	fmt.Println("\n--- Deep Crawl: Wikipedia Pakistan (10 sub-links, clean extraction) ---")
	crawlStart := time.Now()
	crawlResults := deepCrawl("https://en.wikipedia.org/wiki/Pakistan", 10)
	crawlDuration := time.Since(crawlStart)
	fmt.Printf("   %d pages in %v\n", len(crawlResults), crawlDuration)

	totalDuration := time.Since(totalStart)

	writeResults(outputFile, results, crawlResults, totalDuration, crawlDuration)
	fmt.Printf("\n📄 Results saved to: %s\n", outputFile)
	fmt.Printf("⏱  Total time: %v\n", totalDuration)
}

// isJSHeavy checks if a Colly-scraped page appears to be JavaScript-rendered.
func isJSHeavy(r TestResult) bool {
	text := r.Text

	// Heuristic 1: Very few links despite large "body" but tiny clean text
	if r.TextLen < 100 && r.Links < 10 {
		return true
	}

	// Heuristic 2: JS keywords in the clean text
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

	// Heuristic 3: Almost no meaningful text after cleaning
	if r.TextLen < 200 && len(r.Headlines) == 0 {
		return true
	}

	return false
}

// scrapeWithColly fetches a page using Colly + smart content extraction.
func scrapeWithColly(pageURL string) TestResult {
	start := time.Now()
	result := TestResult{URL: pageURL, Engine: "colly"}

	c := colly.NewCollector(
		colly.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)
	c.SetRequestTimeout(15 * time.Second)

	c.OnHTML("html", func(e *colly.HTMLElement) {
		result.Status = e.Response.StatusCode

		// Use smart content extraction
		title, cleanText, headlines, method := crawler.ExtractContent(e, pageURL)
		result.Method = method
		result.Title = title
		result.Text = cleanText
		result.TextLen = len(cleanText)
		result.Headlines = headlines

		// Count links
		linkCount := 0
		e.ForEach("a[href]", func(_ int, el *colly.HTMLElement) {
			href := el.Attr("href")
			if href != "" && (strings.HasPrefix(href, "http") || strings.HasPrefix(href, "/")) {
				linkCount++
			}
		})
		result.Links = linkCount
	})

	c.OnError(func(r *colly.Response, err error) {
		result.Error = err.Error()
		if r != nil {
			result.Status = r.StatusCode
		}
	})

	c.Visit(pageURL)
	result.Duration = time.Since(start)
	return result
}

// scrapeWithScrapling calls Python FastAPI /scrapling/fetch endpoint.
func scrapeWithScrapling(pageURL string) TestResult {
	start := time.Now()
	result := TestResult{URL: pageURL, Engine: "scrapling"}

	params := url.Values{}
	params.Set("url", pageURL)
	params.Set("follow_links", "false")
	params.Set("limit", "1")

	reqURL := fmt.Sprintf("%s/scrapling/fetch?%s", fastAPIBase, params.Encode())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(reqURL)
	if err != nil {
		result.Error = err.Error()
		result.Duration = time.Since(start)
		return result
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		result.Error = err.Error()
		result.Duration = time.Since(start)
		return result
	}

	result.Status = resp.StatusCode

	var scraplingResp ScraplingResponse
	if err := json.Unmarshal(body, &scraplingResp); err != nil {
		result.Error = fmt.Sprintf("JSON decode: %v", err)
		result.Duration = time.Since(start)
		return result
	}

	if len(scraplingResp.Results) > 0 {
		r := scraplingResp.Results[0]
		result.Title = r.Title
		result.Text = r.Text
		result.TextLen = len(r.Text)
		result.Links = len(r.Links)
	}

	result.Duration = time.Since(start)
	return result
}

func checkFastAPI() bool {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(fastAPIBase + "/docs")
	if err != nil {
		return false
	}
	resp.Body.Close()
	return resp.StatusCode == 200
}

func deepCrawl(seedURL string, limit int) []TestResult {
	var results []TestResult
	var wikiLinks []string

	seedResult := TestResult{URL: seedURL, Engine: "colly"}
	c := colly.NewCollector(
		colly.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"),
	)
	c.SetRequestTimeout(15 * time.Second)

	c.OnHTML("html", func(e *colly.HTMLElement) {
		seedResult.Status = e.Response.StatusCode
		title, cleanText, headlines, _ := crawler.ExtractContent(e, seedURL)
		seedResult.Title = title
		seedResult.TextLen = len(cleanText)
		seedResult.Headlines = headlines
		if len(cleanText) > 5000 {
			seedResult.Text = cleanText[:5000]
		} else {
			seedResult.Text = cleanText
		}

		seen := make(map[string]bool)
		e.ForEach("#mw-content-text a[href]", func(_ int, el *colly.HTMLElement) {
			href := el.Attr("href")
			if strings.HasPrefix(href, "/wiki/") &&
				!strings.Contains(href, ":") &&
				!seen[href] &&
				len(wikiLinks) < limit {
				seen[href] = true
				wikiLinks = append(wikiLinks, "https://en.wikipedia.org"+href)
			}
		})
		seedResult.Links = len(wikiLinks)
	})
	c.Visit(seedURL)
	results = append(results, seedResult)

	for i, link := range wikiLinks {
		fmt.Printf("   [%d/%d] %s\n", i+1, len(wikiLinks), link)
		r := scrapeWithColly(link)
		results = append(results, r)
	}

	return results
}

func writeResults(filename string, singleResults []TestResult, crawlResults []TestResult, totalDuration, crawlDuration time.Duration) {
	f, err := os.Create(filename)
	if err != nil {
		fmt.Printf("Error creating file: %v\n", err)
		return
	}
	defer f.Close()

	fmt.Fprintf(f, "==========================================================\n")
	fmt.Fprintf(f, "  CLEAN CONTENT EXTRACTION TEST RESULTS\n")
	fmt.Fprintf(f, "  (Smart Selectors + JS Detection + Scrapling Fallback)\n")
	fmt.Fprintf(f, "  Date: %s\n", time.Now().Format(time.RFC3339))
	fmt.Fprintf(f, "==========================================================\n\n")

	// Stats
	collyCount, scraplingCount := 0, 0
	collyChars, scraplingChars := 0, 0
	jsDetected := 0
	totalHeadlines := 0
	for _, r := range singleResults {
		if r.Engine == "colly" {
			collyCount++
			collyChars += r.TextLen
		} else {
			scraplingCount++
			scraplingChars += r.TextLen
		}
		if r.JSHeavy {
			jsDetected++
		}
		totalHeadlines += len(r.Headlines)
	}
	crawlChars := 0
	for _, r := range crawlResults {
		crawlChars += r.TextLen
	}

	fmt.Fprintf(f, "SUMMARY\n")
	fmt.Fprintf(f, "-------\n")
	fmt.Fprintf(f, "JS-heavy pages detected:       %d\n", jsDetected)
	fmt.Fprintf(f, "Pages scraped by Colly:         %d (%d clean chars / %.2f KB)\n", collyCount, collyChars, float64(collyChars)/1024)
	fmt.Fprintf(f, "Pages scraped by Scrapling:     %d (%d chars / %.2f KB)\n", scraplingCount, scraplingChars, float64(scraplingChars)/1024)
	fmt.Fprintf(f, "Headlines extracted:            %d\n", totalHeadlines)
	fmt.Fprintf(f, "Deep crawl pages:               %d (%d chars / %.2f KB)\n", len(crawlResults), crawlChars, float64(crawlChars)/1024)
	fmt.Fprintf(f, "Total time:                     %v\n\n", totalDuration)

	// Timing table
	fmt.Fprintf(f, "ALL PAGES\n")
	fmt.Fprintf(f, "---------\n")
	fmt.Fprintf(f, "%-50s | %-15s | %-10s | %-12s | %-6s | %-5s | Headlines\n", "URL", "Method", "Time", "Clean Text", "Links", "JS?")
	fmt.Fprintf(f, "%s\n", strings.Repeat("-", 130))
	for _, r := range singleResults {
		name := r.URL
		if len(name) > 48 {
			name = name[:48]
		}
		js := ""
		if r.JSHeavy {
			js = "YES"
		}
		methodLabel := r.Method
		if methodLabel == "" {
			methodLabel = r.Engine
		}
		fmt.Fprintf(f, "%-50s | %-15s | %-10v | %-8d chr | %-6d | %-5s | %d\n", name, methodLabel, r.Duration, r.TextLen, r.Links, js, len(r.Headlines))
	}
	fmt.Fprintf(f, "\n")

	// Detailed results
	fmt.Fprintf(f, "==========================================================\n")
	fmt.Fprintf(f, "  DETAILED RESULTS (Clean Extracted Text)\n")
	fmt.Fprintf(f, "==========================================================\n\n")

	for i, r := range singleResults {
		fmt.Fprintf(f, "--- Result %d ---\n", i+1)
		fmt.Fprintf(f, "URL:         %s\n", r.URL)
		fmt.Fprintf(f, "Engine:      %s\n", r.Engine)
		fmt.Fprintf(f, "Title:       %s\n", r.Title)
		fmt.Fprintf(f, "Status:      %d\n", r.Status)
		fmt.Fprintf(f, "Clean Text:  %d chars (%.2f KB)\n", r.TextLen, float64(r.TextLen)/1024)
		fmt.Fprintf(f, "Links:       %d\n", r.Links)
		fmt.Fprintf(f, "Time:        %v\n", r.Duration)
		fmt.Fprintf(f, "Method:      %s\n", r.Method)
		fmt.Fprintf(f, "JS Heavy:    %v\n", r.JSHeavy)

		if len(r.Headlines) > 0 {
			fmt.Fprintf(f, "\n--- HEADLINES (%d) ---\n", len(r.Headlines))
			for j, h := range r.Headlines {
				fmt.Fprintf(f, "  %d. %s\n", j+1, h)
			}
		}

		if r.Error != "" {
			fmt.Fprintf(f, "Error:       %s\n", r.Error)
		}
		fmt.Fprintf(f, "\n--- CLEAN TEXT (first 5000 chars) ---\n")
		text := r.Text
		if len(text) > 5000 {
			text = text[:5000]
		}
		fmt.Fprintf(f, "%s\n\n\n", text)
	}

	// Deep crawl
	fmt.Fprintf(f, "==========================================================\n")
	fmt.Fprintf(f, "  DEEP CRAWL (Wikipedia Pakistan sub-links)\n")
	fmt.Fprintf(f, "==========================================================\n\n")
	fmt.Fprintf(f, "Duration: %v | Pages: %d\n\n", crawlDuration, len(crawlResults))

	for i, r := range crawlResults {
		fmt.Fprintf(f, "--- Crawled Page %d ---\n", i+1)
		fmt.Fprintf(f, "URL:         %s\n", r.URL)
		fmt.Fprintf(f, "Title:       %s\n", r.Title)
		fmt.Fprintf(f, "Clean Text:  %d chars (%.2f KB)\n", r.TextLen, float64(r.TextLen)/1024)
		fmt.Fprintf(f, "Links:       %d\n", r.Links)
		fmt.Fprintf(f, "Time:        %v\n", r.Duration)
		fmt.Fprintf(f, "\n--- CLEAN TEXT (first 3000 chars) ---\n")
		text := r.Text
		if len(text) > 3000 {
			text = text[:3000]
		}
		fmt.Fprintf(f, "%s\n\n\n", text)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
