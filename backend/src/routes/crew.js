const express = require('express');
const router = express.Router();
const crewController = require('../controllers/crewController');
const auth = require('../middleware/auth');

router.get('/', auth, crewController.getAll);
router.get('/:id', auth, crewController.getOne);
router.post('/', auth, crewController.create);
router.put('/:id', auth, crewController.update);
router.delete('/:id', auth, crewController.remove);

module.exports = router;
