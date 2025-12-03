import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { SendResetDto } from './send-reset.dto';
import { CompleteResetDto } from './complete-reset.dto';

@Controller('password')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  // Debug/status endpoint (remove or secure in production)
  @Get('status')
  status() {
    return this.service.getAdminInitStatus();
  }

  // POST /password/send-reset-email
  @Post('send-reset-email')
  async sendResetEmail(@Body() body: SendResetDto) {
    const { to, token, role, displayName } = body;
    if (!to || !token) throw new HttpException('Missing to or token', HttpStatus.BAD_REQUEST);

    const ok = await this.service.sendResetEmail(to, token, role, displayName);
    if (!ok) {
      // return 500 so frontend can fall back to dev flow
      throw new HttpException('Failed to send email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { success: true };
  }

  // POST /password/complete-reset
  @Post('complete-reset')
  async completeReset(@Body() body: CompleteResetDto) {
    const { token, newPassword } = body;
    if (!token || !newPassword) throw new HttpException('Missing token or newPassword', HttpStatus.BAD_REQUEST);
    try {
      await this.service.completeReset(token, newPassword);
      return { success: true, message: "Password reset successfully" };      
    } catch (err) {
      const msg = err?.message || 'Reset failed';
      // Treat admin-not-initialized / other server errors as 500
      if (msg.includes('Firebase Admin not initialized') || msg.includes('Failed to')) {
        throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      // token/user errors => 400
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }
}