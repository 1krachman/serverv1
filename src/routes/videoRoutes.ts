import { Router } from 'express';
import { VideoController } from '../controllers/videoController';
import { upload, handleMulterError } from '../middleware/upload';

const router = Router();
const videoController = new VideoController();

// Upload route with error handling
router.post('/upload', 
  upload.single('video'), 
  handleMulterError,
  videoController.uploadVideo
);

router.get('/', videoController.getAllVideos);
router.get('/:id', videoController.getVideoById);
router.put('/:id', videoController.updateVideo);
router.delete('/:id', videoController.deleteVideo);


// New progress tracking routes
router.get('/progress/:uploadId', videoController.getUploadProgress);
router.get('/progress', videoController.getAllUploadProgress);
router.get('/progress/:uploadId/stream', videoController.streamUploadProgress);
router.delete('/progress/:uploadId/cancel', videoController.cancelUpload);


export default router;