const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const auth = require('../middleware/auth');

router.get('/', auth, categoriesController.getAll);
router.post('/', auth, categoriesController.create);

module.exports = router;
