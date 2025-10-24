import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { storage } from '../cloudinary.config';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // ✅ Join Class
  @Post('join-class')
  async joinClass(@Body() body: any) {
    const { studentId, classId } = body;
    if (!studentId || !classId)
      throw new BadRequestException('Missing studentId or classId');
    return await this.studentService.joinClassByLink(studentId, classId);
  }

  // ✅ Leave Class
  @Post('leave-class')
  async leaveClass(@Body() body: any) {
    const { studentId, classId } = body;
    if (!studentId || !classId)
      throw new BadRequestException('Missing studentId or classId');
    return await this.studentService.leaveClass(studentId, classId);
  }

  // ✅ Get Notifications
  @Get('notifications/:studentId')
  async getStudentNotifications(@Param('studentId') studentId: string) {
    return await this.studentService.getStudentNotifications(studentId);
  }

  // ✅ Get Schedule
  @Get('schedule/:studentId')
  async getStudentSchedule(@Param('studentId') studentId: string) {
    return await this.studentService.getStudentSchedule(studentId);
  }

  // ✅ Upload Profile Picture (Actual Image)
  @Post('upload-profile-picture/:studentId')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadProfilePicture(
    @Param('studentId') studentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.studentService.saveProfilePicture(studentId, file.path);
  }
}
