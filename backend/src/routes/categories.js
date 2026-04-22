const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const auth = require('../middleware/auth');

router.get('/', auth, categoriesController.getAll);
router.post('/', auth, categoriesController.create);
router.put('/:id', auth, categoriesController.update);
router.delete('/:id', auth, categoriesController.remove);

module.exports = router;
