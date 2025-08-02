import { Request, Response } from 'express';
import { VideoService } from '../services/videoService';

const videoService = new VideoService();

export class VideoController {
  async uploadVideo(req: Request, res: Response) {
    try {
      const { title, description, categoryIds } = req.body;
      const file = req.file;

      // Validation
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Validasi file type
      if (!file.mimetype.startsWith('video/')) {
        return res.status(400).json({ error: 'Only video files are allowed' });
      }

      // Pastikan file buffer tersedia (untuk direct upload)
      if (!file.buffer) {
        return res.status(400).json({ error: 'File buffer not available. Please check multer configuration.' });
      }

      // Start upload with progress tracking - DIRECT ke Cloudinary
      const result = await videoService.uploadVideo({
        title,
        description,
        categoryIds: categoryIds ? (Array.isArray(categoryIds) ? categoryIds : [categoryIds]) : [],
        file: {
          buffer: file.buffer,         // Direct buffer untuk upload langsung
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }
      });

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: result.video,
        uploadId: result.uploadId,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to upload video'
      });
    }
  }

  // Real-time upload progress endpoint
  async getUploadProgress(req: Request, res: Response) {
    try {
      const { uploadId } = req.params;
      
      if (!uploadId) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }

      const progress = videoService.getUploadProgress(uploadId);
      
      if (!progress) {
        return res.status(404).json({ error: 'Upload not found or already completed' });
      }

      res.json({
        success: true,
        message: 'Upload progress retrieved successfully',
        data: progress,
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Get all active upload progress
  async getAllUploadProgress(req: Request, res: Response) {
    try {
      const allProgress = videoService.getAllUploadProgress();
      
      res.json({
        success: true,
        message: 'All upload progress retrieved successfully',
        data: allProgress,
        count: allProgress.length
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Server-Sent Events untuk real-time progress tracking
  async streamUploadProgress(req: Request, res: Response) {
    const { uploadId } = req.params;

    if (!uploadId) {
      return res.status(400).json({ error: 'Upload ID is required' });
    }

    // Set headers untuk Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      uploadId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Listen for progress updates
    const progressListener = (progress: any) => {
      if (progress.uploadId === uploadId) {
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          ...progress,
          timestamp: new Date().toISOString()
        })}\n\n`);
        
        // Close connection when upload is completed or error
        if (progress.status === 'completed' || progress.status === 'error') {
          res.write(`data: ${JSON.stringify({ 
            type: 'finished', 
            status: progress.status,
            uploadId,
            timestamp: new Date().toISOString()
          })}\n\n`);
          res.end();
        }
      }
    };

    videoService.on('uploadProgress', progressListener);

    // Clean up on client disconnect
    req.on('close', () => {
      videoService.removeListener('uploadProgress', progressListener);
      console.log(`Client disconnected from upload progress stream: ${uploadId}`);
    });

    // Heartbeat untuk keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ 
        type: 'heartbeat', 
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000); // Every 30 seconds

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }

  async getAllVideos(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      
      // TODO: Add pagination and search to service
      const videos = await videoService.getAllVideos();
      
      res.json({
        success: true,
        message: 'Videos retrieved successfully',
        data: videos,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          // total: videos.length
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  async getVideoById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Video ID is required' });
      }

      const video = await videoService.getVideoById(id);
      
      res.json({
        success: true,
        message: 'Video retrieved successfully',
        data: video,
      });
    } catch (error: any) {
      if (error.message === 'Video not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message 
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  async updateVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, categoryIds } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Video ID is required' });
      }

      if (!title && !description && !categoryIds) {
        return res.status(400).json({ error: 'At least one field (title, description, or categoryIds) is required for update' });
      }

      const updatedVideo = await videoService.updateVideo(id, {
        title,
        description,
        categoryIds: categoryIds ? (Array.isArray(categoryIds) ? categoryIds : [categoryIds]) : undefined,
      });

      res.json({
        success: true,
        message: 'Video updated successfully',
        data: updatedVideo,
      });
    } catch (error: any) {
      if (error.message === 'Video not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message 
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  async deleteVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Video ID is required' });
      }

      const result = await videoService.deleteVideo(id);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      if (error.message === 'Video not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message 
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Cancel upload endpoint
  async cancelUpload(req: Request, res: Response) {
    try {
      const { uploadId } = req.params;
      
      if (!uploadId) {
        return res.status(400).json({ error: 'Upload ID is required' });
      }

      videoService.cancelUpload(uploadId);
      
      res.json({
        success: true,
        message: 'Upload cancelled successfully',
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // Health check untuk video upload system
  async healthCheck(req: Request, res: Response) {
    try {
      const activeUploads = videoService.getAllUploadProgress();
      
      res.json({
        success: true,
        message: 'Video service is healthy',
        data: {
          activeUploads: activeUploads.length,
          timestamp: new Date().toISOString(),
          cloudinaryStatus: 'connected' // TODO: Add actual cloudinary health check
        }
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
}