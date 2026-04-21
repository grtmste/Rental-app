const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clientsController');
const auth = require('../middleware/auth');

router.get('/', auth, clientsController.getAll);
router.get('/:id', auth, clientsController.getOne);
router.post('/', auth, clientsController.create);
router.put('/:id', auth, clientsController.update);
router.delete('/:id', auth, clientsController.remove);
router.get('/:id/communications', auth, clientsController.getCommunications);
router.post('/:id/communications', auth, clientsController.addCommunication);

module.exports = router;
