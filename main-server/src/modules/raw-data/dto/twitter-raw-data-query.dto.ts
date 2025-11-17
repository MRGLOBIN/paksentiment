import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TwitterRawDataQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(10)
  @Max(100)
  maxResults = 10;
}

export class TwitterSentimentQueryDto extends TwitterRawDataQueryDto {
  @Max(50)
  maxResults = 10;
}

