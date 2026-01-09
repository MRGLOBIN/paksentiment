import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class StoredDataQueryDto {
    @ApiPropertyOptional({ description: 'Filter by platform (e.g. reddit, twitter)' })
    @IsString()
    @IsOptional()
    platform?: string;

    @ApiPropertyOptional({ description: 'Filter by text content' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by sentiment (positive, negative, neutral)' })
    @IsString()
    @IsOptional()
    sentiment?: string;

    @ApiPropertyOptional({ description: 'Start date for filtering' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'End date for filtering' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiPropertyOptional({ description: 'Limit number of results', default: 1000 })
    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5000)
    @Transform(({ value }) => parseInt(value, 10))
    limit?: number = 100;
}
