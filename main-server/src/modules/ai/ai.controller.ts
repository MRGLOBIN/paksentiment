import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AiService, ChatMessage } from './ai.service';
import { AuthGuard } from '../auth/auth.guard';
import { ActivityService } from '../activity/activity.service';

import { IsArray, IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
    @IsString()
    role: 'user' | 'assistant' | 'system';

    @IsString()
    content: string;
}

export class ChatDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    messages: ChatMessageDto[];
}

export class TranslateDto {
    @IsString()
    @IsNotEmpty()
    text: string;

    @IsString()
    @IsOptional()
    sourceLanguage?: string;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ai')
/**
 * Controller for AI features like collaborative chat and translation.
 */
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly activityService: ActivityService,
    ) { }

    @Post('chat')
    @ApiOperation({
        summary: 'Chat with Pakistani AI Assistant',
        description: 'Send messages to get responses in Pakistani style. Supports Urdu, Pashto, Punjabi, Saraiki, and English.',
    })
    @ApiBody({ type: ChatDto })
    async chat(@Body() dto: ChatDto, @Request() req) {
        await this.activityService.logActivity(req.user.sub, 'AI_CHAT', {
            messageCount: dto.messages.length,
        });

        const response = await this.aiService.chat(dto.messages);
        return { response };
    }

    @Post('translate')
    @ApiOperation({
        summary: 'Translate Pakistani languages to English',
        description: 'Translate text from Urdu, Pashto, Punjabi, Saraiki, Sindhi, or Balochi to English.',
    })
    @ApiBody({ type: TranslateDto })
    async translate(@Body() dto: TranslateDto, @Request() req) {
        await this.activityService.logActivity(req.user.sub, 'AI_TRANSLATE', {
            textLength: dto.text.length,
            sourceLanguage: dto.sourceLanguage,
        });

        const translation = await this.aiService.translate(dto.text, dto.sourceLanguage);
        return { translation };
    }
}
