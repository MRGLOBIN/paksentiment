import { Match } from '@decorators/match.decorator';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDTO {
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @MinLength(8)
  @IsNotEmpty()
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$%&*?!#])[A-Za-z\d!#$%&*?]{8,}$/, {
    message:
      'A Password Should be greater than 8 characters and must contain alphabet, number and special character',
  })
  password: string;

  @Match('password', { message: 'Confirm Password must match password field' })
  @IsNotEmpty({ message: 'Confirm Password is required' })
  confirmPassword: string;
}
