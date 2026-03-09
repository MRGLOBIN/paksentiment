import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google OAuth ID token',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjdlM...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
