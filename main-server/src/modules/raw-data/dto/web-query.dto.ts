import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebScrapeQueryDto {
  @ApiProperty({
    example: 'https://dawn.com/news/1802342',
    description: 'URL to scrape and analyze',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    example: 'custom-session-uuid-1234',
    description: 'Client-provided session ID to group multiple scrape results together',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Follow links found on the page',
  })
  @IsOptional()
  @IsBoolean()
  followLinks?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Max links to follow (1-100), 0 for unlimited',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  fetchLimit?: number;

  @ApiPropertyOptional({
    example: 'Positive, Negative, Neutral',
    description: 'Custom sentiment tags (comma-separated)',
  })
  @IsOptional()
  @IsString()
  customTags?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Optional ID to group multiple analysis runs into one session',
  })
  @IsOptional()
  @IsString()
  overrideSessionId?: string;
}
