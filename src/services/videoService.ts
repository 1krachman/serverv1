import cloudinary from '../config/cloudinary';
import prisma from '../config/database';
import { VideoUpload, VideoUpdate } from '../types/video';
import { EventEmitter } from 'events';

interface UploadProgress {
  uploadId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  stage: 'validation' | 'cloudinary' | 'database' | 'finished';
  message?: string;
  startTime?: Date;
  estimatedTimeRemaining?: number;
  bytesUploaded?: number;
  totalBytes?: number;
}

interface VideoFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export class VideoService extends EventEmitter {
  private uploadProgressMap: Map<string, UploadProgress> = new Map();
  private uploadStreams: Map<string, any> = new Map(); // For cancellation support

  constructor() {
    super();
    this.setMaxListeners(100); // Handle multiple concurrent uploads
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
      status: 'uploading' as const,
      stage: 'validation' as const,
      startTime: new Date()
    };

    const updatedProgress = { ...currentProgress, ...progress };
    
    // Calculate estimated time remaining
    if (updatedProgress.progress > 0 && updatedProgress.startTime) {
      const elapsed = Date.now() - updatedProgress.startTime.getTime();
      const rate = updatedProgress.progress / elapsed;
      const remaining = (100 - updatedProgress.progress) / rate;
      updatedProgress.estimatedTimeRemaining = Math.round(remaining / 1000); // seconds
    }

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
      this.uploadStreams.delete(uploadId);
    }, 3600000); // 1 hour
  }

  // Validate file before upload
  private validateFile(file: VideoFile): void {
    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only video files are allowed.');
    }

    // Check buffer
    if (!file.buffer || file.buffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }
  }

  async uploadVideo(data: VideoUpload, onProgress?: (progress: UploadProgress) => void) {
    const uploadId = this.generateUploadId();
    
    try {
      // Initialize progress
      this.updateProgress(uploadId, {
        progress: 0,
        status: 'uploading',
        stage: 'validation',
        message: 'Validating file...',
        startTime: new Date(),
        totalBytes: data.file.size
      });

      // Subscribe to progress updates if callback provided
      if (onProgress) {
        this.on('uploadProgress', onProgress);
      }

      // Validate file
      this.validateFile(data.file);

      // Update progress - validation complete
      this.updateProgress(uploadId, {
        progress: 5,
        stage: 'cloudinary',
        message: 'Starting direct upload to Cloudinary...'
      });

      // Upload LANGSUNG ke Cloudinary dengan optimasi
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'videos',
            quality: 'auto:good',
            fetch_format: 'auto',
            // Optimasi untuk berbagai device
            eager: [
              { width: 1280, height: 720, crop: 'limit', quality: 'auto:good', format: 'mp4' },
              { width: 854, height: 480, crop: 'limit', quality: 'auto:low', format: 'mp4' },
              { width: 640, height: 360, crop: 'limit', quality: 'auto:low', format: 'webm' }
            ],
            // Metadata
            context: {
              alt: data.title,
              caption: data.description || '',
              upload_id: uploadId
            },
            // Callback untuk transformasi
            eager_async: true,
            // Notification URL (optional)
            // notification_url: 'https://your-domain.com/cloudinary-webhook'
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

        // Store stream for potential cancellation
        this.uploadStreams.set(uploadId, uploadStream);

        // Track upload progress
        uploadStream.on('progress', (progressData: any) => {
          if (progressData.bytes_sent && progressData.bytes_total) {
            const percentage = Math.round((progressData.bytes_sent / progressData.bytes_total) * 75); // 75% for upload
            this.updateProgress(uploadId, {
              progress: Math.max(5, percentage), // Minimum 5% after validation
              message: `Uploading to Cloudinary... ${percentage}%`,
              bytesUploaded: progressData.bytes_sent,
              totalBytes: progressData.bytes_total
            });
          }
        });

        // Error handling
        uploadStream.on('error', (error: any) => {
          this.updateProgress(uploadId, {
            progress: 0,
            status: 'error',
            message: `Upload stream error: ${error.message}`
          });
          reject(error);
        });

        // HANYA gunakan buffer - Direct upload
        try {
          uploadStream.end(data.file.buffer);
        } catch (streamError: any) {
          reject(new Error(`Failed to write buffer to stream: ${streamError.message}`));
        }
      });

      // Update progress for database save
      this.updateProgress(uploadId, {
        progress: 90,
        message: 'Saving video metadata to database...'
      });

      // Save to database dengan error handling
      const video = await prisma.video.create({
        data: {
          title: data.title,
          description: data.description || null,
          cloudinaryId: result.public_id,
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          format: result.format,
          duration: result.duration || null,
          width: result.width || null,
          height: result.height || null,
          fileSize: result.bytes || data.file.size,
          categories: data.categoryIds && data.categoryIds.length > 0 ? {
            connect: data.categoryIds.map((id: string) => ({ id }))
          } : undefined,
        },
        include: {
          categories: true // Include categories in response
        }
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
      console.error(`Upload failed for ${uploadId}:`, error);
      
      this.updateProgress(uploadId, {
        progress: 0,
        status: 'error',
        message: `Failed to upload video: ${error.message}`
      });

      // Clean up stream
      const stream = this.uploadStreams.get(uploadId);
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }
      this.uploadStreams.delete(uploadId);

      // Remove listener if callback was provided
      if (onProgress) {
        this.removeListener('uploadProgress', onProgress);
      }

      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  // Enhanced getAllVideos with pagination and search
  async getAllVideos(options?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    sortBy?: 'uploadedAt' | 'title' | 'duration';
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        categoryId,
        sortBy = 'uploadedAt',
        sortOrder = 'desc'
      } = options || {};

      // Building where clause
      const whereClause: any = {};
      
      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (categoryId) {
        whereClause.categories = {
          some: { id: categoryId }
        };
      }

      // Get total count
      const totalCount = await prisma.video.count({ where: whereClause });

      // Get videos with pagination
      const videos = await prisma.video.findMany({
        where: whereClause,
        include: {
          categories: true
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        videos,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch videos: ${error.message}`);
    }
  }

  async getVideoById(id: string) {
    try {
      const video = await prisma.video.findUnique({
        where: { id },
        include: {
          categories: true
        }
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
      // Check if video exists
      const existingVideo = await prisma.video.findUnique({
        where: { id }
      });

      if (!existingVideo) {
        throw new Error('Video not found');
      }

      const updateData: any = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      
      // Handle categories update
      if (data.categoryIds !== undefined) {
        updateData.categories = {
          set: [], // Clear existing connections
          connect: data.categoryIds.map((id: string) => ({ id }))
        };
      }

      const video = await prisma.video.update({
        where: { id },
        data: updateData,
        include: {
          categories: true
        }
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

      // Delete from Cloudinary first
      try {
        await cloudinary.uploader.destroy(video.publicId, {
          resource_type: 'video',
        });
      } catch (cloudinaryError: any) {
        console.warn(`Failed to delete from Cloudinary: ${cloudinaryError.message}`);
        // Continue with database deletion even if Cloudinary fails
      }

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

  // Enhanced cancel upload
  cancelUpload(uploadId: string): boolean {
    const progress = this.uploadProgressMap.get(uploadId);
    const stream = this.uploadStreams.get(uploadId);
    
    if (!progress) {
      return false;
    }

    // Can only cancel if still uploading
    if (progress.status === 'uploading' || progress.status === 'processing') {
      // Destroy upload stream if exists
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }

      // Update progress
      this.updateProgress(uploadId, {
        status: 'cancelled',
        message: 'Upload cancelled by user'
      });

      // Clean up
      this.uploadStreams.delete(uploadId);
      
      return true;
    }

    return false;
  }

  // Get upload statistics
  getUploadStats() {
    const allProgress = Array.from(this.uploadProgressMap.values());
    
    return {
      total: allProgress.length,
      uploading: allProgress.filter(p => p.status === 'uploading').length,
      processing: allProgress.filter(p => p.status === 'processing').length,
      completed: allProgress.filter(p => p.status === 'completed').length,
      error: allProgress.filter(p => p.status === 'error').length,
      cancelled: allProgress.filter(p => p.status === 'cancelled').length,
    };
  }

  // Bulk delete videos
  async bulkDeleteVideos(ids: string[]) {
    try {
      const videos = await prisma.video.findMany({
        where: { id: { in: ids } }
      });

      if (videos.length === 0) {
        throw new Error('No videos found to delete');
      }

      // Delete from Cloudinary
      const cloudinaryDeletions = videos.map(video => 
        cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' })
          .catch(error => console.warn(`Failed to delete ${video.publicId} from Cloudinary:`, error))
      );

      await Promise.allSettled(cloudinaryDeletions);

      // Delete from database
      const deleteResult = await prisma.video.deleteMany({
        where: { id: { in: ids } }
      });

      return {
        message: `Successfully deleted ${deleteResult.count} videos`,
        deletedCount: deleteResult.count
      };
    } catch (error: any) {
      throw new Error(`Failed to bulk delete videos: ${error.message}`);
    }
  }
}