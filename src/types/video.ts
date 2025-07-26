

type MulterFile = Express.Multer.File;

export interface VideoUpload {
  title: string;
  description?: string;
  file: MulterFile;
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
}

export interface VideoUpdate {
  title?: string;
  description?: string;
}
