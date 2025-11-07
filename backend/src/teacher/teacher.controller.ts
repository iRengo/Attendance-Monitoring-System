import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
  Param,
  Delete,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { TeacherService } from "./teacher.service";
import { storage } from "../cloudinary.config";

@Controller("teacher")
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Post("add-class")
  async addClass(@Body() body: any) {
    const { teacherId, subjectName, roomNumber, section, days, time, gradeLevel } = body;
    if (!teacherId || !subjectName || !roomNumber || !section || !days || !time || !gradeLevel)
      throw new BadRequestException("All fields are required including grade level.");
    return await this.teacherService.addClass(body);
  }

  @Get("classes")
  async getClasses(@Query("teacherId") teacherId: string) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.getClasses(teacherId);
  }

  @Put("update-class/:classId")
  async updateClass(@Param("classId") classId: string, @Body() body: any) {
    const { teacherId, subjectName, roomNumber, section, days, time, gradeLevel } = body;
    if (!teacherId || !subjectName || !roomNumber || !section || !days || !time || !gradeLevel)
      throw new BadRequestException("All fields are required including grade level.");
    return await this.teacherService.updateClass(teacherId, classId, body);
  }

  @Delete("delete-class/:classId")
  async deleteClass(
    @Param("classId") classId: string,
    @Query("teacherId") teacherId: string
  ) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.deleteClass(teacherId, classId);
  }

  @Post("add-post")
  async addPost(@Body() body: any) {
    const { teacherId, classId, content, fileUrl, imageUrl, fileName, fileType } = body;
    if (!teacherId || !classId || (!content && !fileUrl && !imageUrl)) {
      throw new BadRequestException("Post must include text, image, or file.");
    }
    return await this.teacherService.addPost({
      teacherId,
      classId,
      content,
      fileUrl,
      imageUrl,
      fileName,
      fileType,
    });
  }

  @Get("class-posts")
  async getClassPosts(
    @Query("teacherId") teacherId: string,
    @Query("classId") classId: string
  ) {
    if (!teacherId || !classId)
      throw new BadRequestException("Teacher ID and Class ID are required.");
    return await this.teacherService.getClassPosts(teacherId, classId);
  }

  @Get("class-students")
  async getClassStudents(
    @Query("teacherId") teacherId: string,
    @Query("classId") classId: string
  ) {
    if (!teacherId || !classId)
      throw new BadRequestException("Teacher ID and Class ID are required.");
    return await this.teacherService.getClassStudents(teacherId, classId);
  }

  @Get("stats")
  async getTeacherStats(@Query("teacherId") teacherId: string) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.getTeacherStats(teacherId);
  }

  @Post("upload-profile-picture/:teacherId")
  @UseInterceptors(FileInterceptor("file", { storage }))
  async uploadProfilePicture(
    @Param("teacherId") teacherId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return await this.teacherService.saveProfilePicture(teacherId, file.path);
  }

  // NEW: Attendance sessions endpoint
  @Get("attendance-sessions")
  async getAttendanceSessions(
    @Query("teacherId") teacherId: string,
    @Query("classId") classId?: string
  ) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.getAttendanceSessions(teacherId, classId);
  }
}