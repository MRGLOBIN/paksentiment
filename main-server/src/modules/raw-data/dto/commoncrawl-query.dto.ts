import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CommonCrawlQueryDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit = 10;

    @IsOptional()
    @IsString()
    domain?: string;

    @IsOptional()
    @IsString()
    crawl_id?: string;

    @IsOptional()
    @IsString()
    keyword?: string;
}
