import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { AttendanceSmsService } from './AttendanceSmsService';
import { AttendanceSmsController } from './AttendanceSmsController';

@Module({
  providers: [SmsService, AttendanceSmsService],
  controllers: [SmsController, AttendanceSmsController],
})
export class SmsModule {}
