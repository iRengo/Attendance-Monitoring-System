import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

const serviceAccount = require('../../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

@Injectable()
export class FirebaseService {
  firestore = admin.firestore();
  auth = admin.auth();
}
