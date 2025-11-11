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
 * Unified storage WITHOUT per-user subfolders.
 * We keep only a top-level folder (student_uploads / teacher_uploads / admin_uploads / uploads)
 * and encode the user id into the public_id. This prevents Cloudinary from creating nested folders.
 *
 * Pattern:
 *   student_uploads: public_id = <studentId>_profile
 *   teacher_uploads: public_id = <teacherId>_profile
 *   admin_uploads:   public_id = <adminId>_profile
 *   fallback uploads: public_id = <baseName>-<timestamp>
 *
 * Re-upload by same user overwrites ONLY that user's asset.
 */
export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const url = (req?.originalUrl || req?.url || '').toLowerCase();

    const teacherId = req?.params?.teacherId;
    const studentId = req?.params?.studentId;
    const adminId   = req?.params?.adminId;

    // Determine base folder (no per-user nesting)
    let folder = 'uploads';
    if (teacherId) folder = 'teacher_uploads';
    else if (studentId) folder = 'student_uploads';
    else if (adminId) folder = 'admin_uploads';
    else {
      if (url.includes('/teacher/')) folder = 'teacher_uploads';
      else if (url.includes('/student/')) folder = 'student_uploads';
      else if (url.includes('/admin/')) folder = 'admin_uploads';
    }

    // Decide public_id (no slashes -> no extra folders)
    let publicId: string;
    if (studentId) {
      publicId = `${studentId}_profile`;
    } else if (teacherId) {
      publicId = `${teacherId}_profile`;
    } else if (adminId) {
      publicId = `${adminId}_profile`;
    } else {
      const baseName = file.originalname
        ? file.originalname.replace(/\.[^.]+$/, '').toLowerCase()
        : 'upload';
      publicId = `${baseName}-${Date.now()}`;
    }

    return {
      folder,                       // e.g. student_uploads
      public_id: publicId,          // e.g. abc123_profile (no subfolder)
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      overwrite: true,              // overwrite only this specific asset
      invalidate: true,             // purge CDN cache
      unique_filename: false,       // use our chosen public_id exactly
      // Optional transformation (keep commented unless needed)
      // transformation: [{ width: 640, height: 640, crop: 'fill', gravity: 'face' }],
    };
  },
});

export default cloudinary;