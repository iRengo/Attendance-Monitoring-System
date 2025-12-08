import { Controller, Post, Body } from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async sendSMS(@Body() body: { to: string; message: string }) {
    const { to, message } = body;
    const result = await this.smsService.sendSMS(to, message);
    return { success: true, result };
  }
}
