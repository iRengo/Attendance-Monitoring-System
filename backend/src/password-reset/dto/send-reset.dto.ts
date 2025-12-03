export class SendResetDto {
    to: string;
    token: string;
    role?: 'student' | 'teacher';
    displayName?: string;
  }