import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TwitterRawDataQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @Transform(({ value, obj }) => {
    // Accept both maxResults and max_results, prioritize the one provided
    const val = value ?? obj.max_results ?? obj.maxResults ?? 10;
    return parseInt(val, 10);
  })
  @IsInt()
  @Min(10)
  @Max(100)
  maxResults = 10;

  // Allow max_results as an alias (snake_case from query params)
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(10)
  @Max(100)
  max_results?: number;

  @IsOptional()
  @IsString()
  customTags?: string;
}

export class TwitterSentimentQueryDto extends TwitterRawDataQueryDto {
  @Max(50)
  maxResults = 10;

  @IsOptional()
  @IsString()
  sentiments?: string;
}
