import { Injectable } from '@nestjs/common';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class AdminService {
  private db = getFirestore();
  private auth = getAuth();

  async approveUser(id: string, type: string) {
    const userRef = this.db.collection(type).doc(id);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new Error('User record not found');
    }

    // Explicitly check data and cast it safely
    const userData = userSnap.data() as {
      email?: string;
      firstName?: string;
      lastName?: string;
    } | undefined;

    if (!userData || !userData.email) {
      throw new Error('User data is missing or incomplete.');
    }

    const email = userData.email;
    const displayName = `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim();

    const randomPassword = this.generateRandomPassword();
    const newUser = await this.auth.createUser({
      email,
      password: randomPassword,
      displayName: displayName || email.split('@')[0],
    });

    await userRef.update({
      status: 'approved',
      uid: newUser.uid,
      generatedPassword: randomPassword,
    });

    return { message: 'User approved successfully', email };
  }

  private generateRandomPassword(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
