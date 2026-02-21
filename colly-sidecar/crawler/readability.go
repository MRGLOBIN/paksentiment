package crawler

import (
	"bytes"
	"log"
	"net/url"
	"strings"

	readability "codeberg.org/readeck/go-readability/v2"
)

// knownDomains maps domains where our CSS selectors are already optimised.
// For these domains, Readability is skipped in favour of the hand-tuned rules.
var knownDomains = []string{
	"wikipedia.org",
	"news.google.com",
	"bbc.com",
	"bbc.co.uk",
	"dawn.com",
	"geo.tv",
}

// shouldUseReadability returns true if the domain is NOT in our
// hand-tuned list, meaning Readability should be tried first.
func shouldUseReadability(pageURL string) bool {
	for _, domain := range knownDomains {
		if strings.Contains(pageURL, domain) {
			return false
		}
	}
	return true
}

// ExtractReadable runs Mozilla Readability on raw HTML bytes.
// Returns the article title, clean text content, and any error.
// If Readability cannot identify an article, it returns empty strings
// (not an error) so the caller can fall back to CSS selectors.
func ExtractReadable(htmlBytes []byte, pageURL string) (title, textContent string, err error) {
	parsedURL, err := url.Parse(pageURL)
	if err != nil {
		return "", "", err
	}

	reader := bytes.NewReader(htmlBytes)

	article, err := readability.FromReader(reader, parsedURL)
	if err != nil {
		// Readability couldn't parse the page — not fatal, just log and return empty.
		log.Printf("[Readability] Could not extract from %s: %v", pageURL, err)
		return "", "", nil
	}

	title = strings.TrimSpace(article.Title())

	// Render article text content using RenderText
	if article.Node != nil {
		var buf bytes.Buffer
		if renderErr := article.RenderText(&buf); renderErr != nil {
			log.Printf("[Readability] RenderText error for %s: %v", pageURL, renderErr)
			return "", "", nil
		}
		textContent = strings.TrimSpace(buf.String())
	}

	// If Readability found almost nothing, treat it as a failure
	if len(textContent) < 100 {
		log.Printf("[Readability] Too little content from %s (%d chars) — will fall back to CSS selectors", pageURL, len(textContent))
		return "", "", nil
	}

	log.Printf("[Readability] Extracted %d chars from %s", len(textContent), pageURL)
	return title, textContent, nil
}
