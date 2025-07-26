import { Request, Response } from 'express';
import { VideoService } from '../services/videoService';

const videoService = new VideoService();

export class VideoController {
  async uploadVideo(req: Request, res: Response) {
    try {
      const { title, description } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Start upload with progress tracking
      const result = await videoService.uploadVideo({
        title,
        description,
        file,
      });

      res.status(201).json({
        message: 'Video uploaded successfully',
        data: result.video,
        uploadId: result.uploadId,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // New endpoint to get upload progress
  async getUploadProgress(req: Request, res: Response) {
    try {
      const { uploadId } = req.params;
      const progress = videoService.getUploadProgress(uploadId);
      
      if (!progress) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      res.json({
        message: 'Upload progress retrieved successfully',
        data: progress,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get all active upload progress
  async getAllUploadProgress(req: Request, res: Response) {
    try {
      const allProgress = videoService.getAllUploadProgress();
      
      res.json({
        message: 'All upload progress retrieved successfully',
        data: allProgress,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // WebSocket or SSE endpoint for real-time progress
  async streamUploadProgress(req: Request, res: Response) {
    const { uploadId } = req.params;

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', uploadId })}\n\n`);

    // Listen for progress updates
    const progressListener = (progress: any) => {
      if (progress.uploadId === uploadId) {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        
        // Close connection when upload is completed or error
        if (progress.status === 'completed' || progress.status === 'error') {
          res.end();
        }
      }
    };

    videoService.on('uploadProgress', progressListener);

    // Clean up on client disconnect
    req.on('close', () => {
      videoService.removeListener('uploadProgress', progressListener);
    });
  }

  async getAllVideos(req: Request, res: Response) {
    try {
      const videos = await videoService.getAllVideos();
      res.json({
        message: 'Videos retrieved successfully',
        data: videos,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getVideoById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const video = await videoService.getVideoById(id);
      
      res.json({
        message: 'Video retrieved successfully',
        data: video,
      });
    } catch (error: any) {
      if (error.message === 'Video not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async updateVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description } = req.body;

      const video = await videoService.updateVideo(id, {
        title,
        description,
      });

      res.json({
        message: 'Video updated successfully',
        data: video,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteVideo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await videoService.deleteVideo(id);
      
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Video not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  // Cancel upload endpoint
  async cancelUpload(req: Request, res: Response) {
    try {
      const { uploadId } = req.params;
      videoService.cancelUpload(uploadId);
      
      res.json({
        message: 'Upload cancelled successfully',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}