const express = require('express');
const router = express.Router();
const quotesController = require('../controllers/quotesController');
const auth = require('../middleware/auth');

router.get('/', auth, quotesController.getAll);
router.get('/:id', auth, quotesController.getOne);
router.post('/', auth, quotesController.create);
router.put('/:id', auth, quotesController.update);
router.delete('/:id', auth, quotesController.remove);
router.post('/:id/send', auth, quotesController.send);

module.exports = router;
