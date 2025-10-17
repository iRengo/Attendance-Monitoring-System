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
import { diskStorage } from "multer";
import { extname } from "path";

@Controller("teacher")
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  // ✅ Add Class
  @Post("add-class")
  async addClass(@Body() body: any) {
    const { teacherId, subjectName, roomNumber, section, days, time, gradeLevel } = body;
    if (!teacherId || !subjectName || !roomNumber || !section || !days || !time || !gradeLevel)
      throw new BadRequestException("All fields are required including grade level.");
    return await this.teacherService.addClass(body);
  }

  // ✅ Get Teacher Classes
  @Get("classes")
  async getClasses(@Query("teacherId") teacherId: string) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.getClasses(teacherId);
  }

  // ✅ Update Class
  @Put("update-class/:classId")
  async updateClass(@Param("classId") classId: string, @Body() body: any) {
    const { teacherId, subjectName, roomNumber, section, days, time, gradeLevel } = body;
    if (!teacherId || !subjectName || !roomNumber || !section || !days || !time || !gradeLevel)
      throw new BadRequestException("All fields are required including grade level.");
    return await this.teacherService.updateClass(teacherId, classId, body);
  }

  // ✅ Delete Class
  @Delete("delete-class/:classId")
  async deleteClass(
    @Param("classId") classId: string,
    @Query("teacherId") teacherId: string
  ) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.deleteClass(teacherId, classId);
  }

  // ✅ Add Post (file/image)
  @Post("add-post")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    })
  )
  async addPost(@UploadedFile() file: any, @Body() body: any) {
    const { teacherId, classId, content } = body;
    if (!teacherId || !classId || !content)
      throw new BadRequestException("Missing required fields.");
    return await this.teacherService.addPost(teacherId, classId, content, file);
  }

  // ✅ Get Class Posts
  @Get("class-posts")
  async getClassPosts(
    @Query("teacherId") teacherId: string,
    @Query("classId") classId: string
  ) {
    if (!teacherId || !classId)
      throw new BadRequestException("Teacher ID and Class ID are required.");
    return await this.teacherService.getClassPosts(teacherId, classId);
  }

  // ✅ Get Students in a Class
  @Get("class-students")
  async getClassStudents(
    @Query("teacherId") teacherId: string,
    @Query("classId") classId: string
  ) {
    if (!teacherId || !classId)
      throw new BadRequestException("Teacher ID and Class ID are required.");
    return await this.teacherService.getClassStudents(teacherId, classId);
  }

  // ✅ NEW: Get teacher dashboard stats
  @Get("stats")
  async getTeacherStats(@Query("teacherId") teacherId: string) {
    if (!teacherId) throw new BadRequestException("Teacher ID is required.");
    return await this.teacherService.getTeacherStats(teacherId);
  }
}
