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
     * Chat with the Pakistani-contextualized AI assistant.
     * 
     * @param messages History of chat messages
     * @returns AI response text
     * @throws InternalServerErrorException if API key missing or request fails
     */
    async chat(messages: ChatMessage[]): Promise<string> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException('GROQ_API_KEY not configured');
        }

        const systemPrompt = `You are a friendly, helpful AI assistant designed for Pakistani users. 
You should:
- Respond in the same language the user writes in (Urdu, Pashto, Punjabi, Saraiki, Sindhi, Balochi, or English)
- Use a warm, culturally appropriate tone similar to how Pakistanis naturally communicate
- Add cultural context when relevant
- Use common Pakistani expressions and phrases when appropriate
- Be respectful and helpful
- If the user writes in Roman Urdu (Urdu written in English letters), respond in the same style
- Understand and respond to greetings like "Assalam o Alaikum", "Salam", "Kya haal hai", etc.`;

        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
            temperature: 0.7,
            max_tokens: 1024,
        };
        console.log('[AiService.chat] Payload:', JSON.stringify(payload));

        try {
            const response: any = await firstValueFrom(
                this.httpService.post(this.groqApiUrl, payload, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                }),
            );
            return response.data.choices[0].message.content;
        } catch (error: any) {
            console.error('[AiService.chat] Error:', error?.response?.data || error.message);
            console.error('[AiService.chat] Status:', error?.response?.status);
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
