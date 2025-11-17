import { Match } from '@decorators/match.decorator';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDTO {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

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
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$%&*?!#])[A-Za-z\d!#$%&*?]{8,}$/, {
    message:
      'A Password Should be greater than 8 characters and must contain alphabet, number and special character',
  })
  password: string;

  @ApiProperty({
    description: 'Password confirmation (must match password)',
    example: 'SecurePass123!',
    format: 'password',
  })
  @Match('password', { message: 'Confirm Password must match password field' })
  @IsNotEmpty({ message: 'Confirm Password is required' })
  confirmPassword: string;
}
