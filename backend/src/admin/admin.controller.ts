import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { diskStorage } from 'multer';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('import-csv')
@UseInterceptors(FileInterceptor('file', {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueName = Date.now() + '-' + file.originalname;
      callback(null, uniqueName);
    },
  }),
}))
async uploadCSV(@UploadedFile() file: Express.Multer.File) {
  if (!file) {
    return { success: false, error: 'No file uploaded' };
  }

  // ✅ Backend validation
  if (!file.originalname.toLowerCase().endsWith('.csv')) {
    return { success: false, error: 'Only CSV files are allowed!' };
  }

  try {
    const results = await this.adminService.importCSV(file);
    return { success: true, results };
  } catch (error) {
    console.error('CSV import failed:', error);
    return { success: false, error: error.message };
  }
}
}
