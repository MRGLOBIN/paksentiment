package crawler

import (
	"regexp"
	"strings"

	"github.com/gocolly/colly/v2"
)

// ContentRule defines how to extract clean content from a specific site.
type ContentRule struct {
	// DomainContains matches if the URL contains this substring.
	DomainContains string
	// ContentSelector is the CSS selector for the main content area.
	ContentSelector string
	// TitleSelector overrides the default <title> extraction.
	TitleSelector string
	// ExcludeSelectors are removed before extracting text.
	ExcludeSelectors []string
	// HeadlineSelector extracts individual headlines (for news sites).
	HeadlineSelector string
}

// siteRules defines extraction rules for known sites.
var siteRules = []ContentRule{
	{
		DomainContains:  "wikipedia.org",
		ContentSelector: "#mw-content-text .mw-parser-output",
		TitleSelector:   "#firstHeading",
		ExcludeSelectors: []string{
			".mw-editsection",      // [edit] links
			".navbox",              // navigation boxes at bottom
			".sidebar",            // info sidebars
			".infobox",            // info boxes (keep data but could be noisy)
			".reference",          // footnote references [1] [2]
			".reflist",            // references section
			"#toc",                // table of contents
			".toc",                // table of contents (mobile)
			"style",               // inline <style> tags
			"script",              // inline <script> tags
			".mw-empty-elt",       // empty elements
			".noprint",            // non-printable elements
			".catlinks",           // category links
			"table.ambox",         // article message boxes
			".hatnote",            // hatnotes ("This article is about...")
			"sup.reference",       // superscript refs
		},
	},
	{
		DomainContains:   "news.google.com",
		ContentSelector:  "main",
		TitleSelector:    "title",
		HeadlineSelector: "article h3, article h4, [data-n-tid] h3, [data-n-tid] h4",
		ExcludeSelectors: []string{
			"script", "style", "noscript",
			"header", "footer", "nav",
		},
	},
	{
		DomainContains:  "bbc.com",
		ContentSelector: "article, #main-content, .article__body",
		TitleSelector:   "h1",
		ExcludeSelectors: []string{
			"script", "style", "nav", "footer", "aside",
			".ad", ".social-embed", ".related",
		},
	},
	{
		DomainContains:  "dawn.com",
		ContentSelector: ".story__content, .template__main",
		TitleSelector:   "h2.story__title, h1",
		ExcludeSelectors: []string{
			"script", "style", "nav", "footer", ".ad",
			".social", ".related", ".sidebar",
		},
	},
	{
		DomainContains:  "geo.tv",
		ContentSelector: ".content-area, .story-detail",
		TitleSelector:   "h1",
		ExcludeSelectors: []string{
			"script", "style", "nav", "footer", ".ad",
		},
	},
}

// genericRule is used when no site-specific rule matches.
var genericRule = ContentRule{
	ContentSelector: "article, main, [role='main'], .content, .post-content, .entry-content, .article-body, #content",
	TitleSelector:   "h1, title",
	ExcludeSelectors: []string{
		"script", "style", "noscript",
		"nav", "footer", "header", "aside",
		".nav", ".menu", ".sidebar", ".ad", ".advertisement",
		".cookie", ".popup", ".modal", ".social-share",
		"#comments", ".comments",
	},
}

// blankLineRE collapses multiple blank lines.
var blankLineRE = regexp.MustCompile(`\n{3,}`)

// cssBlockRE matches inline CSS blocks like ".mw-parser-output .foo{...}"
var cssBlockRE = regexp.MustCompile(`(?s)\.mw-parser-output[^{]*\{[^}]*\}`)

// mediaQueryRE matches @media CSS rules (can be multi-level nested)
var mediaQueryRE = regexp.MustCompile(`(?s)@media[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}`)

// cssPropertyRE matches remaining CSS-like patterns: "selector{property:value}"
var cssPropertyRE = regexp.MustCompile(`(?s)[a-z.\-#][a-z.\-#\s,>:+~\[\]="'*]*\{[^}]{5,}\}`)

// htmlClassRE matches HTML/CSS class name artifacts like "html.skin-theme-clientpref-night"
var htmlClassRE = regexp.MustCompile(`(?i)^(html|body)\.[a-z\-\.]+`)

// templateMsgRE matches Wikipedia template messages
var templateMsgRE = regexp.MustCompile(`(?i)(This article (has multiple issues|needs additional|may need to be|may be in need)|Please help (improve|by editing)|Learn how and when to remove|Relevant discussion may be found|Unsourced material may be challenged)`)

// sentenceEndRE checks if a line ends with sentence-ending punctuation
var sentenceEndRE = regexp.MustCompile(`[.!?:;)\]"'…]\s*$`)

// sidebarHeaderRE matches Wikipedia sidebar/navbox header patterns
var sidebarHeaderRE = regexp.MustCompile(`(?i)^Part of a series on`)

// controversyRE matches sidebar links about controversies/scandals (not real article content)
var controversyRE = regexp.MustCompile(`(?i)^[A-Z].*\b(controversy|scandal|plagiarism)\s*$`)

// ExtractContent pulls clean, readable text from an HTML element.
// Returns: title, cleanText, headlines, method (the extraction method used: "readability" or "css-selectors").
func ExtractContent(e *colly.HTMLElement, pageURL string) (title, cleanText string, headlines []string, method string) {
	method = "css-selectors"
	rule := findRule(pageURL)

	// For generic domains (not in our known list), try Readability first.
	if shouldUseReadability(pageURL) && e.Response != nil && len(e.Response.Body) > 0 {
		rTitle, rText, err := ExtractReadable(e.Response.Body, pageURL)
		if err == nil && rText != "" {
			// Readability succeeded — use its output
			method = "readability"
			title = rTitle
			if title == "" {
				title = strings.TrimSpace(e.ChildText("title"))
			}

			// Extract headlines (still useful for news sites)
			if rule.HeadlineSelector != "" {
				e.ForEach(rule.HeadlineSelector, func(_ int, el *colly.HTMLElement) {
					h := strings.TrimSpace(el.Text)
					if h != "" && len(h) > 5 {
						headlines = append(headlines, h)
					}
				})
			}

			// Polish the Readability output with our text cleaner
			cleanText = cleanExtractedText(rText)
			return title, cleanText, headlines, method
		}
	}

	// Fallback: use site-specific CSS selectors (original approach)

	// Extract title
	if rule.TitleSelector != "" {
		title = strings.TrimSpace(e.ChildText(rule.TitleSelector))
	}
	if title == "" {
		title = strings.TrimSpace(e.ChildText("title"))
	}

	// Extract headlines if applicable (for news sites)
	if rule.HeadlineSelector != "" {
		e.ForEach(rule.HeadlineSelector, func(_ int, el *colly.HTMLElement) {
			h := strings.TrimSpace(el.Text)
			if h != "" && len(h) > 5 {
				headlines = append(headlines, h)
			}
		})
	}

	// Extract main content text
	contentSelector := rule.ContentSelector
	if contentSelector == "" {
		contentSelector = "body"
	}

	// Try content selector first
	rawText := ""
	e.ForEach(contentSelector, func(_ int, el *colly.HTMLElement) {
		if rawText != "" {
			rawText += "\n\n"
		}
		rawText += el.Text
	})

	// Fallback to body if content selector found nothing
	if strings.TrimSpace(rawText) == "" {
		rawText = e.ChildText("body")
	}

	// Clean the text
	cleanText = cleanExtractedText(rawText)

	return title, cleanText, headlines, method
}

// findRule returns the best-matching content rule for a URL.
func findRule(pageURL string) ContentRule {
	for _, rule := range siteRules {
		if strings.Contains(pageURL, rule.DomainContains) {
			return rule
		}
	}
	return genericRule
}

// isSentenceLike returns true if a line looks like a real sentence or informative content.
// Short fragments (sidebar labels, category names) are filtered out.
func isSentenceLike(line string) bool {
	// Always keep lines that are long enough to be informative (likely real paragraphs)
	if len(line) >= 80 {
		return true
	}

	// Keep lines with sentence-ending punctuation (periods, question marks, etc.)
	if sentenceEndRE.MatchString(line) && len(line) >= 30 {
		return true
	}

	// Short lines with strong sentence end (.!?) are still OK
	if len(line) >= 15 && (strings.HasSuffix(strings.TrimSpace(line), ".") ||
		strings.HasSuffix(strings.TrimSpace(line), "?") ||
		strings.HasSuffix(strings.TrimSpace(line), "!")) {
		return true
	}

	// Keep lines that contain commas (likely part of a sentence or list)
	if strings.Contains(line, ",") && len(line) >= 30 {
		return true
	}

	// Keep section headings (they start with capital and are moderate length)
	// But filter out very short ones that are just tags like "Finance", "Deepfake"
	if len(line) >= 60 {
		return true
	}

	// Drop everything else — these are typically sidebar items, nav labels,
	// category tags like "Deepfake", "AI safety", "Robotics", etc.
	return false
}

// cleanExtractedText removes noise from extracted text.
func cleanExtractedText(text string) string {
	// Step 1: Strip inline CSS blocks (from <style> tags captured by Colly)
	text = mediaQueryRE.ReplaceAllString(text, "")
	text = cssBlockRE.ReplaceAllString(text, "")
	text = cssPropertyRE.ReplaceAllString(text, "")

	// Step 2: Remove common navigation patterns
	noisePatterns := []string{
		"Jump to content",
		"Main menu",
		"move to sidebar",
		"hide",
		"Navigation",
		"Main pageContentsCurrent events",
		"Random articleAbout WikipediaContact us",
		"HelpLearn to editCommunity portal",
		"Recent changesUpload fileSpecial pages",
		"What links hereRelated changesUpload file",
		"Permanent linkPage informationCite this page",
		"Download as PDFPrintable version",
		"Create account",
		"Personal tools",
		"ReadView sourceView history",
		"Donate Create account Log in",
		"From Wikipedia, the free encyclopedia",
		"window.wiz_progress",
		"_DumpException",
		".prototype.",
		"this.gbar_",
	}

	for _, noise := range noisePatterns {
		text = strings.ReplaceAll(text, noise, "")
	}

	// Step 3: Remove Wikipedia-specific noise
	text = strings.ReplaceAll(text, "[edit]", "")
	text = strings.ReplaceAll(text, "[citation needed]", "")

	// Step 4: Filter lines — keep only real sentences and informative content
	lines := strings.Split(text, "\n")
	var cleanLines []string
	skipBlock := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip empty or very short lines
		if len(trimmed) < 3 {
			continue
		}

		// Skip HTML/CSS class artifacts like "html.skin-theme-clientpref-night vte"
		if htmlClassRE.MatchString(trimmed) {
			continue
		}

		// Skip Wikipedia template messages
		if templateMsgRE.MatchString(trimmed) {
			continue
		}

		// Detect sidebar/navbox blocks and skip them
		if sidebarHeaderRE.MatchString(trimmed) {
			skipBlock = true
			continue
		}

		// Skip sidebar controversy/scandal links
		if controversyRE.MatchString(trimmed) {
			continue
		}

		// End sidebar skip when we hit a real sentence (80+ chars or has punctuation)
		if skipBlock {
			if len(trimmed) >= 80 || sentenceEndRE.MatchString(trimmed) {
				skipBlock = false
			} else {
				continue
			}
		}

		// Apply sentence-like filter to keep only real content
		if !isSentenceLike(trimmed) {
			continue
		}

		cleanLines = append(cleanLines, trimmed)
	}
	text = strings.Join(cleanLines, "\n")

	// Step 5: Collapse multiple blank lines
	text = blankLineRE.ReplaceAllString(text, "\n\n")

	// Step 6: Final trim
	text = strings.TrimSpace(text)

	return text
}
