import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Body,
  Delete,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { storage } from '../cloudinary.config';
import { diskStorage } from 'multer';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('import-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + file.originalname;
          callback(null, uniqueName);
        },
      }),
    }),
  )
  async uploadCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed!');
    }

    const {
      success,
      results,
      addedCount,
      existingCount,
      failedCount,
      totalRows,
    } = await this.adminService.importCSV(file);

    // Return expanded metrics (frontend relies on these counts)
    return {
      success,
      addedCount,
      existingCount,
      failedCount,
      totalRows,
      results,
    };
  }

  @Post('add-student')
  async addStudent(
    @Body()
    body: {
      firstname?: string;
      middlename?: string;
      lastname?: string;
      personal_email?: string;
      guardianname?: string;
      guardiancontact?: string;
      gradelevel?: string;
      section?: string;
      [key: string]: any;
    },
  ) {
    if (!body || !body.firstname || !body.lastname || !body.personal_email) {
      throw new BadRequestException(
        'Missing required fields: firstname, lastname, personal_email',
      );
    }
    const result = await this.adminService.addStudent(body);
    return { success: true, result };
  }

  @Post('toggle-maintenance')
  async toggleMaintenance(@Body() body: { enabled: boolean }) {
    const { enabled } = body;
    if (enabled === undefined)
      throw new BadRequestException('Missing enabled flag');

    const result = await this.adminService.toggleMaintenance(enabled);
    return { success: true, result };
  }

  @Post('announcement')
  async postAnnouncement(@Body() body: { message: string; title?: string; target?: string }) {
    if (!body.message) throw new BadRequestException('Missing announcement text');
    const result = await this.adminService.postAnnouncement(
      body.title || '',
      body.message,
      body.target || 'all'
    );
    return { success: true, result };
  }

  @Post('edit-user')
  async editUser(
    @Body()
    body: { role: 'student' | 'teacher'; userId: string; updates: any },
  ) {
    const { role, userId, updates } = body;
    if (!role || !userId || !updates)
      throw new BadRequestException('Missing role, userId or updates');

    const result = await this.adminService.editUser(role, userId, updates);
    return { success: true, result };
  }

  @Delete('delete-user')
  async deleteUser(
    @Body()
    body: { role: 'student' | 'teacher'; userId: string },
  ) {
    const { role, userId } = body;
    if (!role || !userId)
      throw new BadRequestException('Missing role or userId');

    const result = await this.adminService.deleteUser(role, userId);
    return { success: true, result };
  }

  @Get('activities')
  async getRecentActivities() {
    const activities = await this.adminService.getRecentActivities();
    return { success: true, activities };
  }

  @Post('upload-profile-picture/:adminId')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadProfilePicture(
    @Param('adminId') adminId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return await this.adminService.saveProfilePicture(adminId, file.path);
  }
}