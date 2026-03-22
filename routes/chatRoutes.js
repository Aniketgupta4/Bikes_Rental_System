const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Jab koi POST request /api/chat pe aayegi, toh handleBikeQuery function chalega
router.post('/api/chat', chatController.handleBikeQuery);

module.exports = router;