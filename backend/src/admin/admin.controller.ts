import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Body,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { diskStorage } from 'multer';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ✅ Import CSV (students or teachers)
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

    const result = await this.adminService.importCSV(file);
    return { success: true, results: result };
  }

  // ✅ Toggle maintenance mode
  @Post('toggle-maintenance')
  async toggleMaintenance(@Body() body: { enabled: boolean }) {
    const { enabled } = body;
    if (enabled === undefined)
      throw new BadRequestException('Missing enabled flag');

    const result = await this.adminService.toggleMaintenance(enabled);
    return { success: true, result };
  }

  // ✅ Post announcement
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

  // ✅ Edit user (student/teacher)
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

  // ✅ Delete user (student/teacher)
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

  // ✅ Fetch recent activities
  @Get('activities')
  async getRecentActivities() {
    const activities = await this.adminService.getRecentActivities();
    return { success: true, activities };
  }
}
