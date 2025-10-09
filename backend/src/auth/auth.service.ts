import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly firebase: FirebaseService) {}

  async register(dto: RegisterDto) {
    const { email, password, role, firstName, lastName } = dto;

    // Create user in Firebase Auth
    const user = await this.firebase.auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Add Firestore record
    await this.firebase.firestore.collection(role === 'student' ? 'students' : 'teachers').doc(user.uid).set({
      email,
      firstName,
      lastName,
      role,
      status: 'pending', // wait for admin approval
    });

    return { message: 'Account created successfully! Pending admin approval.' };
  }

  async login(dto: LoginDto) {
    // NestJS can’t verify passwords directly (Firebase Admin SDK doesn’t do it)
    // So the FRONTEND should still do signInWithEmailAndPassword()
    // and send the token here for verification

    return { message: 'Login handled on frontend — verify token here if needed.' };
  }
}
