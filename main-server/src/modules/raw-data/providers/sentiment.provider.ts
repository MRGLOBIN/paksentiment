import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SentimentProvider {
    private readonly logger = new Logger(SentimentProvider.name);
    private readonly ollamaUrl: string;
    private readonly ollamaModel: string;
    private readonly fastApiBaseUrl: string;

    constructor(private readonly httpService: HttpService) {
        this.ollamaUrl = process.env.OLLAMA_URL || 'https://llm.h4mxa.com';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'phi3:mini';
        this.fastApiBaseUrl = process.env.FAST_API_BASE_URL || 'http://localhost:8000';
    }

    /**
     * Run sentiment analysis — tries Ollama phi3:mini first, falls back to FastAPI.
     */
    async analyzeSentiment(posts: any[], customTags?: string): Promise<any[]> {
        const CHUNK_SIZE = 2000;
        const allDocs: { id: string; text: string; originalId: string }[] = [];

        posts.forEach((p) => {
            const text = p.content || '';
            if (text.length > CHUNK_SIZE) {
                const chunks = this.chunkString(text, CHUNK_SIZE);
                chunks.forEach((chunk, idx) => {
                    allDocs.push({
                        id: `${p.id}_chunk_${idx}`,
                        originalId: p.id,
                        text: chunk,
                    });
                });
            } else if (text.length > 0) {
                allDocs.push({ id: p.id, originalId: p.id, text });
            }
        });

        if (allDocs.length === 0) return [];

        // ── Try Ollama phi3:mini first ──
        let rawSentiments: any[] | null = null;
        try {
            const ollamaUp = await this.isOllamaAvailable();
            if (ollamaUp) {
                this.logger.log(`[Sentiment] Ollama available — using ${this.ollamaModel} for ${allDocs.length} doc(s)`);
                rawSentiments = await this.analyzeSentimentWithOllama(allDocs, customTags);
            } else {
                this.logger.warn('[Sentiment] Ollama unavailable — falling back to FastAPI');
            }
        } catch (err) {
            this.logger.warn(`[Sentiment] Ollama sentiment failed: ${err.message} — falling back to FastAPI`);
        }

        // ── Fallback to FastAPI local model ──
        if (!rawSentiments) {
            this.logger.log('[Sentiment] Using FastAPI local model for sentiment analysis');
            try {
                const sentimentRes = await firstValueFrom(
                    this.httpService.post(
                        `${this.fastApiBaseUrl}/sentiment/analyze/local`,
                        {
                            documents: allDocs.map((d) => ({ id: d.id, text: d.text })),
                            ...(customTags ? { custom_sentiments: customTags } : {}),
                        },
                        { timeout: 60000 }
                    )
                );
                rawSentiments = sentimentRes.data?.sentiment || [];
            } catch (err) {
                this.logger.warn(`[Sentiment] FastAPI sentiment fallback failed: ${err.message}`);
                rawSentiments = [];
            }
        }

        // ── Aggregate chunks back to original documents ──
        const sentimentMap = new Map<string, any[]>();
        (rawSentiments ?? []).forEach((s: any) => {
            const match = allDocs.find((d) => d.id === s.id);
            if (match) {
                const oid = match.originalId;
                if (!sentimentMap.has(oid)) sentimentMap.set(oid, []);
                sentimentMap.get(oid)!.push(s);
            }
        });

        const aggregated = Array.from(sentimentMap.entries()).map(([id, resultList]) => {
            if (resultList.length === 1) return { ...resultList[0], id };

            const counts: Record<string, number> = {};
            let totalConfidence = 0;
            const summaries: string[] = [];

            resultList.forEach((r: any) => {
                counts[r.sentiment] = (counts[r.sentiment] || 0) + (r.confidence || 0);
                totalConfidence += r.confidence || 0;
                if (r.summary) summaries.push(r.summary);
            });

            const winner = Object.keys(counts).reduce((a, b) =>
                counts[a] > counts[b] ? a : b,
            );

            return {
                id,
                sentiment: winner,
                confidence: totalConfidence / resultList.length,
                topic: resultList[0]?.topic || 'General',
                summary: summaries.join('\n---\n'),
                engine: resultList[0]?.engine || 'unknown',
                chunk_results: resultList,
            };
        });

        // ── Ensure every entry has topic (FastAPI doesn't return it) ──
        for (const entry of aggregated) {
            if (!entry.topic || entry.topic === 'General') {
                const post = posts.find((p: any) => p.id === entry.id);
                const snippet = (post?.content || post?.text || '').substring(0, 500);
                if (snippet.length > 30) {
                    try {
                        const topicRes = await firstValueFrom(
                            this.httpService.post(
                                `${this.ollamaUrl}/api/generate`,
                                {
                                    model: this.ollamaModel,
                                    prompt: `Classify the main topic of this text as a single word (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law, Society, Entertainment). Reply with ONLY the single word.\n\nText: "${snippet}"\n\nTopic:`,
                                    stream: false,
                                },
                                { timeout: 15000 },
                            ),
                        );
                        const topicRaw = (topicRes.data?.response || '').trim();
                        const firstWord = topicRaw.split(/[\s,.\n]/)[0].replace(/[^a-zA-Z]/g, '');
                        if (firstWord && firstWord.length > 1 && firstWord.length < 20) {
                            entry.topic = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
                            this.logger.log(`[Sentiment] Extracted topic "${entry.topic}" for doc ${entry.id}`);
                        }
                    } catch {
                        entry.topic = 'General';
                    }
                } else {
                    entry.topic = 'General';
                }
            }
            entry.topic = entry.topic || 'General';
        }

        return aggregated;
    }

    /**
     * Quick health-check ping to the Ollama server.
     */
    async isOllamaAvailable(): Promise<boolean> {
        try {
            this.logger.log(`[Sentiment] Pinging Ollama at ${this.ollamaUrl}/api/generate (model: ${this.ollamaModel})`);
            const res = await firstValueFrom(
                this.httpService.post(
                    `${this.ollamaUrl}/api/generate`,
                    { model: this.ollamaModel, prompt: 'Reply OK', stream: false },
                    { timeout: 15000 },
                ),
            );
            const available = res.data?.done === true;
            this.logger.log(`[Sentiment] Ollama health check result: ${available}`);
            return available;
        } catch (err) {
            this.logger.warn(`[Sentiment] Ollama health check failed: ${err.message}`);
            return false;
        }
    }

    /**
     * Analyze sentiment using the self-hosted Ollama phi3:mini model.
     */
    async analyzeSentimentWithOllama(docs: { id: string; text: string }[], customTags?: string): Promise<any[]> {
        const results: any[] = [];

        for (const doc of docs) {
            const prompt = this.buildSentimentPrompt(doc.text, customTags);

            const res = await firstValueFrom(
                this.httpService.post(
                    `${this.ollamaUrl}/api/generate`,
                    {
                        model: this.ollamaModel,
                        prompt,
                        stream: false,
                    },
                    { timeout: 60000 },
                ),
            );

            const raw = res.data?.response || '';
            let sentiment = 'Neutral';
            let confidence = 0.5;
            let topic = 'General';
            let summary = raw.trim();

            try {
                const jsonMatch = raw.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    sentiment = parsed.sentiment || sentiment;
                    confidence = typeof parsed.confidence === 'number'
                        ? parsed.confidence
                        : parseFloat(parsed.confidence) || confidence;
                    topic = parsed.topic || topic;
                    summary = parsed.summary || summary;
                }
            } catch {
                const lower = raw.toLowerCase();
                if (lower.includes('positive')) {
                    sentiment = 'Positive';
                    confidence = 0.7;
                } else if (lower.includes('negative')) {
                    sentiment = 'Negative';
                    confidence = 0.7;
                } else {
                    sentiment = 'Neutral';
                    confidence = 0.5;
                }
                summary = raw.substring(0, 300).trim();
            }

            results.push({
                id: doc.id,
                sentiment,
                confidence: Math.min(Math.max(confidence, 0), 1),
                topic,
                summary,
                engine: 'ollama:' + this.ollamaModel,
            });
        }

        return results;
    }

    /**
     * Build a structured sentiment analysis prompt for the LLM.
     */
    private buildSentimentPrompt(text: string, customTags?: string): string {
        const categories = customTags ? customTags : 'Positive, Negative, Neutral';

        return `You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).

Classify the sentiment as one of: ${categories}
Identify the main topic as a single word (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law).
Write a concise summary of 3-4 sentences that captures the key points for a content preview.

Respond in this exact JSON format:
{"sentiment": "<category>", "confidence": <0.0 to 1.0>, "topic": "<single word topic>", "summary": "<3-4 sentence summary>"}

Text to analyze:
"""${text.substring(0, 1500)}"""

JSON response:`;
    }

    private chunkString(str: string, size: number): string[] {
        const numChunks = Math.ceil(str.length / size);
        const chunks = new Array(numChunks);
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
            chunks[i] = str.substring(o, Math.min(o + size, str.length));
        }
        return chunks;
    }
}
