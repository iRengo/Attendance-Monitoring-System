import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

// Reads from your existing env:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

@Controller("files")
export class FilesController {
  // Returns a signed image URL for page 1 of a PDF (small thumbnail)
  // Example: GET /files/pdf-thumb?publicId=post_uploads/abc123.pdf&w=92&h=92
  @Get("pdf-thumb")
  getPdfThumb(
    @Query("publicId") publicId?: string,
    @Query("w") w?: string,
    @Query("h") h?: string
  ) {
    if (!publicId) throw new BadRequestException("Missing publicId");

    const width = Math.max(16, parseInt(w || "92", 10));
    const height = Math.max(16, parseInt(h || "92", 10));

    const url = cloudinary.url(publicId.replace(/^\//, ""), {
      resource_type: "image",
      type: "upload",
      sign_url: true,
      secure: true,
      transformation: [
        { page: 1 }, // pg_1
        { width, height, crop: "fill" }, // w_, h_, c_fill
        { fetch_format: "auto", quality: "auto" }, // f_auto, q_auto
      ],
    });

    return { url };
  }
}