import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

/*
  PasswordResetService (robust initialization + authEmail resolution fallback)

  Fix included:
  - tryGetFirebaseUser now accepts an optional string (email?: string) and returns null
    immediately when email is undefined. This avoids the TS2345 error when passing
    a variable of type string | undefined.
  - resolvedEmail is explicitly typed as string | undefined.
*/

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private transporter: nodemailer.Transporter | null = null;
  private firestore: FirebaseFirestore.Firestore | null = null;
  private adminInitialized = false;

  private adminInitPromise: Promise<void> | null = null;

  constructor() {
    void this.initAdmin();
    this.initTransporter();
  }

  getAdminInitStatus() {
    return {
      adminInitialized: this.adminInitialized,
      firestoreAvailable: !!this.firestore,
      initializedAppsCount: admin.apps ? admin.apps.length : 0,
    };
  }

  private async initAdmin(): Promise<void> {
    if (this.adminInitialized) return;
    if (this.adminInitPromise) return this.adminInitPromise;

    this.adminInitPromise = (async () => {
      this.logger.log('Attempting Firebase Admin initialization...');

      if (admin.apps && admin.apps.length > 0) {
        try {
          this.logger.log('Reusing existing Firebase Admin app.');
          this.firestore = getFirestore();
          this.adminInitialized = true;
          return;
        } catch (err) {
          this.logger.warn('Existing Firebase app detected but failed to reuse; continuing to attempt init.', err as any);
        }
      }

      const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (gacPath) {
        try {
          const fullPath = path.isAbsolute(gacPath) ? gacPath : path.resolve(process.cwd(), gacPath);
          if (!fs.existsSync(fullPath)) {
            this.logger.warn(`GOOGLE_APPLICATION_CREDENTIALS set but file not found at ${fullPath}`);
          } else {
            admin.initializeApp({
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
            });
            this.firestore = getFirestore();
            this.adminInitialized = true;
            this.logger.log('Firebase Admin initialized using GOOGLE_APPLICATION_CREDENTIALS (ADC).');
            return;
          }
        } catch (err) {
          this.logger.error('Failed to init Firebase Admin using GOOGLE_APPLICATION_CREDENTIALS', err as any);
        }
      } else {
        this.logger.debug('GOOGLE_APPLICATION_CREDENTIALS not set.');
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

      if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) privateKey = privateKey.slice(1, -1);

      if (projectId && clientEmail && privateKey) {
        try {
          privateKey = privateKey.replace(/\\n/g, '\n');
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            } as admin.ServiceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
          });
          this.firestore = getFirestore();
          this.adminInitialized = true;
          this.logger.log('Firebase Admin initialized using FIREBASE_* environment variables.');
          return;
        } catch (err) {
          this.logger.error('Failed to init Firebase Admin using FIREBASE_* env variables', err as any);
        }
      } else {
        this.logger.debug('FIREBASE_* env vars incomplete (projectId, clientEmail, or privateKey missing).');
      }

      this.logger.warn(
        'Firebase Admin not initialized. Provide GOOGLE_APPLICATION_CREDENTIALS (path to JSON) OR FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY env variables.'
      );
    })();

    try {
      await this.adminInitPromise;
    } finally {
      this.adminInitPromise = null;
    }
  }

  private initTransporter() {
    const user = process.env.SYSTEM_EMAIL;
    const pass = process.env.SYSTEM_EMAIL_PASSWORD;
    if (!user || !pass) {
      this.logger.warn('SYSTEM_EMAIL or SYSTEM_EMAIL_PASSWORD not set; mail will not send.');
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
      });
      this.logger.log('Mail transporter initialized.');
    } catch (err) {
      this.logger.error('Failed to create mail transporter', err as any);
      this.transporter = null;
    }
  }

  async sendResetEmail(to: string, token: string, role?: string, displayName?: string) {
    if (!this.transporter) {
      this.logger.warn('Mail transporter not configured; skip sending.');
      return false;
    }

    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const resetUrl = `${frontendOrigin.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    const from = process.env.POST_NOTIFICATION_FROM || process.env.SYSTEM_EMAIL;
    const subjectPrefix = process.env.POST_NOTIFICATION_SUBJECT_PREFIX || '';

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #222">
        <p>Hi ${displayName || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to continue. This link expires in 15 minutes.</p>
        <p style="margin:18px 0">
          <a href="${resetUrl}" style="background:#3498db;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Reset password</a>
        </p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: `${subjectPrefix} Password reset request`,
        html,
      });
      this.logger.log(`Reset email sent to ${to}`);
      return true;
    } catch (err) {
      this.logger.error('sendMail failed', err as any);
      return false;
    }
  }

  // completeReset: try to resolve the correct auth email if the stored one is wrong
  async completeReset(token: string, newPassword: string) {
    await this.initAdmin();

    if (!this.adminInitialized || !this.firestore) {
      this.logger.error('completeReset: Firebase Admin still not initialized after re-init attempt.');
      throw new Error('Firebase Admin not initialized on server.');
    }

    const resetRef = this.firestore.collection('password_resets').doc(token);
    const snap = await resetRef.get();
    if (!snap.exists) throw new Error('Invalid token');

    const data = snap.data();
    if (!data) throw new Error('Invalid token data');
    if (data.used) throw new Error('Token already used');

    let expiresAt: Date | null = null;
    if (data.expiresAt) {
      if (typeof data.expiresAt.toDate === 'function') expiresAt = data.expiresAt.toDate();
      else expiresAt = new Date(data.expiresAt);
    }
    if (expiresAt && expiresAt < new Date()) throw new Error('Token expired');

    const originalAuthEmail: string | undefined = data.authEmail;
    if (!originalAuthEmail && !data.userDocId) throw new Error('No authEmail or userDocId on reset doc');

    // Prefer the stored authEmail, but attempt fallback resolution if it fails or looks wrong.
    let resolvedEmail: string | undefined = originalAuthEmail;

    // Helper to test if an email is unusable (system email or falsy)
    const unusable = (email?: string) =>
      !email || email.trim() === '' || email === process.env.SYSTEM_EMAIL;

    // Helper that returns a Firebase UserRecord or null. Accepts optional string to avoid TS errors.
    const tryGetFirebaseUser = async (email?: string): Promise<admin.auth.UserRecord | null> => {
      if (!email) return null;
      try {
        return await admin.auth().getUserByEmail(email);
      } catch (err: any) {
        if (err && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email')) {
          return null;
        }
        throw err;
      }
    };

    // Explicitly type firebaseUser to allow assigning UserRecord | null
    let firebaseUser: admin.auth.UserRecord | null = null;

    if (!unusable(resolvedEmail)) {
      firebaseUser = await tryGetFirebaseUser(resolvedEmail);
    } else {
      firebaseUser = null;
    }

    // If we didn't find the user or the resolved email looks wrong, try to find the user's school/auth email from their Firestore profile
    if (!firebaseUser && data.userDocId) {
      this.logger.warn(`authEmail lookup failed for "${resolvedEmail}", attempting to resolve via userDocId "${data.userDocId}"`);

      const candidateCollections = ['students', 'teachers', 'users', 'accounts', 'profiles'];
      for (const col of candidateCollections) {
        try {
          const userDocRef = this.firestore.collection(col).doc(data.userDocId);
          const udsnap = await userDocRef.get();
          if (!udsnap.exists) continue;
          const udata = udsnap.data() as Record<string, any>;

          // Candidate field names commonly used for school/signed-in emails
          const candidateEmail =
            udata.school_email ||
            udata.schoolEmail ||
            udata.authEmail ||
            udata.email ||
            udata.personalEmail ||
            udata.personal_email ||
            udata.contact_email;

          if (candidateEmail && !unusable(candidateEmail)) {
            this.logger.log(`Resolved potential auth email from ${col}/${data.userDocId}: ${candidateEmail}`);
            resolvedEmail = candidateEmail;
            firebaseUser = await tryGetFirebaseUser(resolvedEmail);
            if (firebaseUser) break;
          }
        } catch (e) {
          this.logger.debug(`Lookup in collection ${col} for doc ${data.userDocId} failed`, e as any);
        }
      }
    }

    // Final attempt: if still no firebaseUser, and originalAuthEmail was present and not the system email, try it once more
    if (!firebaseUser && originalAuthEmail && !unusable(originalAuthEmail)) {
      firebaseUser = await tryGetFirebaseUser(originalAuthEmail);
      resolvedEmail = originalAuthEmail;
    }

    if (!firebaseUser) {
      this.logger.error('completeReset: could not resolve a Firebase Auth user for reset token', { originalAuthEmail, resolvedEmail, userDocId: data.userDocId });
      throw new Error('User account not found for reset token');
    }

    // Update the user's password (firebaseUser is guaranteed non-null here)
    await admin.auth().updateUser(firebaseUser.uid, { password: newPassword });

    // Mark the reset token as used
    await resetRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

    return true;
  }
}