import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    FirebaseModule,
    MulterModule.register({
      storage: multer.memoryStorage(), // ✅ file kept in memory
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  ],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
