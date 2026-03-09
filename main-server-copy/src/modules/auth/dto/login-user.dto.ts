import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginWithEmailAndPasswordDTO {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'Password (8+ characters with alphabet, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
    format: 'password',
  })
  @MinLength(8)
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, {
    message:
      'A password should be greater than 8 characters and must contain alphabet, number and special character',
  })
  password: string;
}
