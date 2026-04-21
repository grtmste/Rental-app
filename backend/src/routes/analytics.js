const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/overview', auth, analyticsController.overview);
router.get('/revenue', auth, analyticsController.revenue);
router.get('/equipment-utilization', auth, analyticsController.equipmentUtilization);
router.get('/top-clients', auth, analyticsController.topClients);
router.get('/crew-hours', auth, analyticsController.crewHours);

module.exports = router;
