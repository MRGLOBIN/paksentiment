import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class LoginWithEmailAndPasswordDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @MinLength(8)
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, {
    message:
      'A password should be greater than 8 characters and must contain alphabet, number and special character',
  })
  password: string;
}
