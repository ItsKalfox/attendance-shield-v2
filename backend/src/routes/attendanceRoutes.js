const express = require('express');
const router = express.Router();
const { scanAttendance, getSessionInfo } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/scan', scanAttendance);
router.get('/session-info/:qrToken', getSessionInfo);

module.exports = router;
