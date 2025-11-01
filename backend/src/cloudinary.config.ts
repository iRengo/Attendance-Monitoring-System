import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import * as dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Storage config that chooses upload folder based on the incoming request.
 * - teacher_uploads for teacher routes
 * - student_uploads for student routes
 * - admin_uploads for admin routes
 * - fallback -> uploads
 */
export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'uploads';

    try {
      const url = (req && (req.originalUrl || req.url || req.baseUrl || '')).toString();

      if (req && req.params) {
        if (req.params.teacherId) folder = 'teacher_uploads';
        else if (req.params.studentId) folder = 'student_uploads';
        else if (req.params.adminId) folder = 'admin_uploads';
      }

      if (folder === 'uploads' && url) {
        const lower = url.toLowerCase();
        if (lower.includes('/teacher/')) folder = 'teacher_uploads';
        else if (lower.includes('/student/')) folder = 'student_uploads';
        else if (lower.includes('/admin/')) folder = 'admin_uploads';
      }
    } catch (e) {
      // keep fallback
    }

    return {
      folder,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: file.originalname ? file.originalname.split('.')[0] : undefined,
    };
  },
});

export default cloudinary;