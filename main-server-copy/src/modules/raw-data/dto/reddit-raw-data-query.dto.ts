import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RedditRawDataQueryDto {
  @IsString()
  subreddit: string;

  @IsString()
  query: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  customTags?: string;
}

export class RedditSentimentQueryDto extends RedditRawDataQueryDto {
  @Max(50)
  limit = 10;

  @IsOptional()
  @IsString()
  sentiments?: string;
}
