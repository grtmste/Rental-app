const express = require('express');
const router = express.Router();
const invoicesController = require('../controllers/invoicesController');
const auth = require('../middleware/auth');

router.get('/', auth, invoicesController.getAll);
router.get('/:id', auth, invoicesController.getOne);
router.post('/', auth, invoicesController.create);
router.put('/:id', auth, invoicesController.update);
router.delete('/:id', auth, invoicesController.remove);
router.post('/:id/send', auth, invoicesController.send);

module.exports = router;
