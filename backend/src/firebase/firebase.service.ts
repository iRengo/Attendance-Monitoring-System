import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

const serviceAccount = require('../../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // ✅ use .env
  });
}

@Injectable()
export class FirebaseService {
  firestore = admin.firestore();
  auth = admin.auth();
  storage = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET); // ✅ bucket reference
}
