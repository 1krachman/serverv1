

type MulterFile = Express.Multer.File;

export interface VideoUpload {
  title: string;
  description?: string;
  // file: MulterFile;
  categoryIds?: string[]; // ✅ Tambahkan ini untuk menghilangkan error
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
}


export interface VideoResponse {
  id: string;
  title: string;
  description?: string;
  cloudinaryId: string;
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  uploadedAt: Date;
  updatedAt: Date;
  categoryIds?: string[]; // Optional array of category IDs
}

export interface VideoUpdate {
  categoryIds: any;
  title?: string;
  description?: string;
}
