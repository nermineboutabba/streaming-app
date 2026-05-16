const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../middleware/uploadMiddleware');

// CREATE
router.post('/videos/upload', upload.single('video'), videoController.createVideo);

// READ ALL
router.get('/videos', videoController.getAllVideos);

// DELETE
router.delete('/videos/:id', videoController.deleteVideo);

// SEARCH
router.get('/videos/search/query', videoController.searchVideos);

// LATEST
router.get('/videos/latest', videoController.getLatestVideos);

// TRENDING
router.get('/videos/trending', videoController.getTrendingVideos);

// READ ONE
router.get('/videos/:id', videoController.getVideoById);

module.exports = router;