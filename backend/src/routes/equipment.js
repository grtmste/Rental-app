const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const auth = require('../middleware/auth');

router.get('/', auth, equipmentController.getAll);
router.get('/:id', auth, equipmentController.getOne);
router.post('/', auth, equipmentController.create);
router.put('/:id', auth, equipmentController.update);
router.delete('/:id', auth, equipmentController.remove);
router.get('/:id/qrcode', auth, equipmentController.getQRCode);
router.get('/:id/logs', auth, equipmentController.getLogs);
router.post('/:id/logs', auth, equipmentController.createLog);

module.exports = router;
