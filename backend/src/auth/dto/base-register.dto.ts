// src/auth/dto/base-register.dto.ts
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class BaseRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['student', 'teacher'])
  role: 'student' | 'teacher';

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
