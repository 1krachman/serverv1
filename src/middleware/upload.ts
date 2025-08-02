import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  console.log('File received:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  // Check if it's a video file
  const allowedMimeTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/quicktime',
    'video/x-msvideo'
  ];
  
  const allowedExtensions = /\.(mp4|mov|avi|mkv|wmv|flv|webm)$/i;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype.toLowerCase());

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only video files are allowed. Received: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(), // Langsung ke memory
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB
  },
  fileFilter,
});


// Export error handler for multer errors
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ error: 'File too large. Maximum size is 10GB.' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ error: 'Unexpected field name. Use "video" as the field name.' });
      default:
        return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
};