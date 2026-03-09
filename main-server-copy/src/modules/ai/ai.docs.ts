import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { ChatDto, TranslateDto } from './ai.controller';

export function ChatDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Chat with Pakistani AI Assistant',
            description: 'Send messages to get responses in Pakistani style. Supports Urdu, Pashto, Punjabi, Saraiki, and English.',
        }),
        ApiBody({ type: ChatDto })
    );
}

export function TranslateDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'Translate Pakistani languages to English',
            description: 'Translate text from Urdu, Pashto, Punjabi, Saraiki, Sindhi, or Balochi to English.',
        }),
        ApiBody({ type: TranslateDto })
    );
}
