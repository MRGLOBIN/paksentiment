import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

@Injectable()
/**
 * Service for AI-powered features (Chat, Translation) using Groq API.
 */
export class AiService {
    private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    private readonly model = 'llama-3.3-70b-versatile'; // Llama 3.3 Stable

    constructor(private readonly httpService: HttpService) { }

    /**
     * Chat with the Pakistani-contextualized AI assistant, equipped with web search.
     * 
     * @param messages History of chat messages
     * @returns AI response text
     * @throws InternalServerErrorException if API key missing or request fails
     */
    async chat(messages: ChatMessage[]): Promise<string> {
        const apiKey = process.env.GROQ_API_KEY;
        const collyUrl = process.env.COLLY_SIDECAR_URL || 'http://localhost:8081';

        if (!apiKey) {
            throw new InternalServerErrorException('GROQ_API_KEY not configured');
        }

        const systemPrompt = `You are a friendly, helpful AI assistant designed for Pakistani users. 
You should:
- Respond in the english language the user writes in (Urdu, Pashto, Punjabi, Saraiki, Sindhi, Balochi, or English)
- Use a warm, culturally appropriate tone similar to how Pakistanis naturally communicate
- Add cultural context when relevant
- Use common Pakistani expressions and phrases when appropriate
- Be respectful and helpful
- If the user writes in Roman Urdu (Urdu written in English letters), respond in the same style
- Understand and respond to greetings like "Assalam o Alaikum", "Salam", "Kya haal hai", etc.
- You have access to a tool called 'search_and_crawl_web'. Use it when you need to answer questions about recent events, latest news, or factual data from the web.`;

        const tools = [
            {
                type: 'function',
                function: {
                    name: 'search_and_crawl_web',
                    description: 'Search the web for up-to-date information and crawl the top result contents. Use this for current events, news, or factual lookups.',
                    parameters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'The search query to look up on the web. Make it clear and concise.'
                            }
                        },
                        required: ['query']
                    }
                }
            }
        ];

        let currentMessages: any[] = [
            { role: 'system', content: systemPrompt },
            ...messages,
        ];

        try {
            // First call to model
            let payload = {
                model: this.model,
                messages: currentMessages,
                tools: tools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 1024,
            };

            console.log('[AiService.chat] Initial Payload sent');
            let response: any = await firstValueFrom(
                this.httpService.post(this.groqApiUrl, payload, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                }),
            );

            let responseMessage = response.data.choices[0].message;

            // Handle tool calls if the model decides to use a tool
            if (responseMessage.tool_calls) {
                console.log('[AiService.chat] Model triggered tool calls:', responseMessage.tool_calls.length);

                // Append the assistant's tool call message to history
                currentMessages.push(responseMessage);

                for (const toolCall of responseMessage.tool_calls) {
                    if (toolCall.function.name === 'search_and_crawl_web') {
                        const args = JSON.parse(toolCall.function.arguments);
                        console.log(`[AiService.chat] Executing search for: "${args.query}"`);

                        let toolResult = "";
                        try {
                            // 1. Search the web
                            const searchRes = await firstValueFrom(
                                this.httpService.post(`${collyUrl}/search`, { query: args.query })
                            );

                            const searchData = searchRes.data;
                            if (searchData.success && searchData.results && searchData.results.length > 0) {
                                // Take top 3 links
                                const topResults = searchData.results.slice(0, 3);
                                console.log(`[AiService.chat] Found ${searchData.results.length} results, scraping top ${topResults.length}...`);

                                // 2. Scrape the links
                                const scrapePromises = topResults.map(async (res: any) => {
                                    try {
                                        const scrapeReq = await firstValueFrom(
                                            this.httpService.post(`${collyUrl}/scrape`, { url: res.link })
                                        );
                                        // Take up to 1500 chars per page to not blow up context window
                                        const text = scrapeReq.data.result?.text || res.snippet;
                                        return `Source: ${res.title} (${res.link})\nContent: ${text.substring(0, 1500)}...\n`;
                                    } catch (err) {
                                        console.error(`[AiService.chat] Failed to scrape ${res.link}:`, err?.message);
                                        return `Source: ${res.title} (${res.link})\nContent: ${res.snippet}\n(Failed to fetch full text)\n`;
                                    }
                                });

                                const scrapedContents = await Promise.all(scrapePromises);
                                toolResult = scrapedContents.join('\n---\n');
                            } else {
                                toolResult = "No search results found.";
                            }
                        } catch (err) {
                            console.error('[AiService.chat] Tool execution error:', err?.message);
                            toolResult = "Error performing web search. Please answer based on your existing knowledge.";
                        }

                        // Append tool response
                        currentMessages.push({
                            tool_call_id: toolCall.id,
                            role: 'tool',
                            name: 'search_and_crawl_web',
                            content: toolResult,
                        });
                    }
                }

                // Second call to model with tool results
                console.log('[AiService.chat] Sending tool results back to model...');

                // Create a new payload without tools to force final answer
                const finalPayload = {
                    model: this.model,
                    messages: currentMessages,
                    temperature: 0.7,
                    max_tokens: 1024,
                };

                response = await firstValueFrom(
                    this.httpService.post(this.groqApiUrl, finalPayload, {

                        headers: { Authorization: `Bearer ${apiKey}` },
                    }),
                );

                responseMessage = response.data.choices[0].message;
            }

            return responseMessage.content;
        } catch (error: any) {
            console.error('[AiService.chat] Error:', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to get chat response');
        }
    }


    /**
     * Translate text from Pakistani languages to English.
     * 
     * @param text Text to translate
     * @param sourceLanguage Optional source language hint
     * @returns Translated English text
     * @throws InternalServerErrorException if request fails
     */
    async translate(text: string, sourceLanguage?: string): Promise<string> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException('GROQ_API_KEY not configured');
        }

        const systemPrompt = `You are a professional translator specializing in Pakistani languages.
Your task is to translate text from any Pakistani language (Urdu, Pashto, Punjabi, Saraiki, Sindhi, Balochi) or Roman Urdu to English.
Rules:
- Provide ONLY the English translation, no explanations
- Preserve the meaning and tone of the original text
- For idioms and cultural expressions, provide natural English equivalents
- If the text is already in English, return it as-is`;

        const userPrompt = sourceLanguage
            ? `Translate the following ${sourceLanguage} text to English:\n\n${text}`
            : `Translate the following text to English:\n\n${text}`;

        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 1024,
        };

        try {
            const response: any = await firstValueFrom(
                this.httpService.post(this.groqApiUrl, payload, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                }),
            );
            return response.data.choices[0].message.content;
        } catch (error: any) {
            console.error('[AiService.translate] Error:', error?.response?.data || error.message);
            throw new InternalServerErrorException('Failed to translate text');
        }
    }
}
