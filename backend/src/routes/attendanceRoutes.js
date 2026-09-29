const express = require('express');
const router = express.Router();
const { scanAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.post('/scan', scanAttendance);

module.exports = router;
