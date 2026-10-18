const express = require('express');
const router = express.Router();
const { scanAttendance, getSessionInfo } = require('../controllers/attendanceController');
const { scanLimiter } = require('../middleware/rateLimiters');

router.post('/scan', scanLimiter, scanAttendance);
router.get('/session-info/:qrToken', getSessionInfo);

module.exports = router;
