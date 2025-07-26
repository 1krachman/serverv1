import cloudinary from '../config/cloudinary';
import prisma from '../config/database';
import { VideoUpload, VideoUpdate } from '../types/video';
import { EventEmitter } from 'events';

interface UploadProgress {
  uploadId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  stage: 'cloudinary' | 'database' | 'finished';
  message?: string;
}

export class VideoService extends EventEmitter {
  private uploadProgressMap: Map<string, UploadProgress> = new Map();

  constructor() {
    super();
  }

  // Generate unique upload ID
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update progress and emit event
  private updateProgress(uploadId: string, progress: Partial<UploadProgress>) {
    const currentProgress = this.uploadProgressMap.get(uploadId) || {
      uploadId,
      progress: 0,
      status: 'uploading',
      stage: 'cloudinary'
    };

    const updatedProgress = { ...currentProgress, ...progress };
    this.uploadProgressMap.set(uploadId, updatedProgress);
    
    // Emit progress event
    this.emit('uploadProgress', updatedProgress);
    
    return updatedProgress;
  }

  // Get upload progress
  getUploadProgress(uploadId: string): UploadProgress | null {
    return this.uploadProgressMap.get(uploadId) || null;
  }

  // Clean up completed uploads after 1 hour
  private cleanupProgress(uploadId: string) {
    setTimeout(() => {
      this.uploadProgressMap.delete(uploadId);
    }, 3600000); // 1 hour
  }

  async uploadVideo(data: VideoUpload, onProgress?: (progress: UploadProgress) => void) {
    const uploadId = this.generateUploadId();
    
    try {
      // Initialize progress
      this.updateProgress(uploadId, {
        progress: 0,
        status: 'uploading',
        stage: 'cloudinary',
        message: 'Starting upload to Cloudinary...'
      });

      // Subscribe to progress updates if callback provided
      if (onProgress) {
        this.on('uploadProgress', onProgress);
      }

      // Upload to Cloudinary with progress tracking
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'videos',
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error, result) => {
            if (error) {
              this.updateProgress(uploadId, {
                progress: 0,
                status: 'error',
                message: `Cloudinary upload failed: ${error.message}`
              });
              reject(error);
            } else {
              this.updateProgress(uploadId, {
                progress: 80,
                status: 'processing',
                stage: 'database',
                message: 'Upload completed, saving to database...'
              });
              resolve(result);
            }
          }
        );

        // Track upload progress
        uploadStream.on('progress', (progress: any) => {
          const percentage = Math.round((progress.bytes_sent / progress.bytes_total) * 70); // 70% for upload
          this.updateProgress(uploadId, {
            progress: percentage,
            message: `Uploading to Cloudinary... ${percentage}%`
          });
        });

        // Handle file stream
        if (data.file.buffer) {
          uploadStream.end(data.file.buffer);
        } else {
          // If using file path
          const fs = require('fs');
          const fileStream = fs.createReadStream(data.file.path);
          fileStream.pipe(uploadStream);
        }
      });

      // Update progress for database save
      this.updateProgress(uploadId, {
        progress: 90,
        message: 'Saving video metadata to database...'
      });

      // Save to database
      const video = await prisma.video.create({
        data: {
          title: data.title,
          description: data.description,
          cloudinaryId: result.public_id,
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          format: result.format,
          duration: result.duration,
          width: result.width,
          height: result.height,
          fileSize: result.bytes,
        },
      });

      // Complete upload
      this.updateProgress(uploadId, {
        progress: 100,
        status: 'completed',
        stage: 'finished',
        message: 'Video upload completed successfully!'
      });

      // Clean up progress after delay
      this.cleanupProgress(uploadId);

      // Remove listener if callback was provided
      if (onProgress) {
        this.removeListener('uploadProgress', onProgress);
      }

      return { video, uploadId };
    } catch (error: any) {
      this.updateProgress(uploadId, {
        progress: 0,
        status: 'error',
        message: `Failed to upload video: ${error.message}`
      });

      // Remove listener if callback was provided
      if (onProgress) {
        this.removeListener('uploadProgress', onProgress);
      }

      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  async getAllVideos() {
    try {
      return await prisma.video.findMany({
        orderBy: {
          uploadedAt: 'desc',
        },
      });
    } catch (error: any) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }
  }

  async getVideoById(id: string) {
    try {
      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        throw new Error('Video not found');
      }

      return video;
    } catch (error: any) {
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
  }

  async updateVideo(id: string, data: VideoUpdate) {
    try {
      const video = await prisma.video.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
        },
      });

      return video;
    } catch (error: any) {
      throw new Error(`Failed to update video: ${error.message}`);
    }
  }

  async deleteVideo(id: string) {
    try {
      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        throw new Error('Video not found');
      }

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(video.publicId, {
        resource_type: 'video',
      });

      // Delete from database
      await prisma.video.delete({
        where: { id },
      });

      return { message: 'Video deleted successfully' };
    } catch (error: any) {
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  // Get all active uploads progress
  getAllUploadProgress(): UploadProgress[] {
    return Array.from(this.uploadProgressMap.values());
  }

  // Cancel upload (if needed)
  cancelUpload(uploadId: string) {
    const progress = this.uploadProgressMap.get(uploadId);
    if (progress && progress.status === 'uploading') {
      this.updateProgress(uploadId, {
        status: 'error',
        message: 'Upload cancelled by user'
      });
    }
  }
}