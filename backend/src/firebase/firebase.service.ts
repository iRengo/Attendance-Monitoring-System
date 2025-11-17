import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const serviceAccount = require(path.join(
  __dirname,
  '..',
  '..',
  'firebase-service-account.json'
));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

@Injectable()
export class FirebaseService {
  firestore = admin.firestore();
  auth = admin.auth();
  storage = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
}
