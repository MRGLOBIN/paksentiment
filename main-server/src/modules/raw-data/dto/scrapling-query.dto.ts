import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ScraplingFetchDto {
    @IsString()
    url: string;

    @IsOptional()
    @IsString()
    sentiments?: string;

    @IsOptional()
    @IsBoolean()
    useLocal?: boolean;

    @IsOptional()
    @IsBoolean()
    followLinks?: boolean;

    @IsOptional()
    @IsString()
    fetchLimit?: string;

    @IsOptional()
    @IsString()
    customTags?: string;
}
