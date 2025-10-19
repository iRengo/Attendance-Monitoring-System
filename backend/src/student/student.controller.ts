import { Controller, Post, Body, BadRequestException, Get, Param } from '@nestjs/common';
import { StudentService } from './student.service';

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

  // ✅ Upload Profile Picture (Base64 JSON)
  @Post('upload-profile-picture/:studentId')
  async uploadProfilePicture(
    @Param('studentId') studentId: string,
    @Body('image') image: string,
  ) {
    if (!image) throw new BadRequestException('No image data provided');
    return await this.studentService.uploadProfilePicture(studentId, image);
  }
}
