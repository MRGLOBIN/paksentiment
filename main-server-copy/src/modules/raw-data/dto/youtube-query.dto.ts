import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class YouTubeSearchDto {
    @IsString()
    query: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    max_results = 10;
}

export class YouTubeCommentsDto {
    @IsString()
    video_id: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    max_results = 10;
}

export class YouTubeTranscriptDto {
    @IsString()
    video_id: string;
}
