const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');
const auth = require('../middleware/auth');

router.get('/', auth, projectsController.getAll);
router.get('/:id', auth, projectsController.getOne);
router.post('/', auth, projectsController.create);
router.put('/:id', auth, projectsController.update);
router.delete('/:id', auth, projectsController.remove);

// Equipment sub-routes
router.get('/:id/equipment', auth, projectsController.getEquipment);
router.post('/:id/equipment', auth, projectsController.addEquipment);
router.put('/:id/equipment/:itemId', auth, projectsController.updateEquipment);
router.delete('/:id/equipment/:itemId', auth, projectsController.removeEquipment);

// Crew sub-routes
router.get('/:id/crew', auth, projectsController.getCrew);
router.post('/:id/crew', auth, projectsController.addCrew);
router.delete('/:id/crew/:memberId', auth, projectsController.removeCrew);

// Task sub-routes
router.get('/:id/tasks', auth, projectsController.getTasks);
router.post('/:id/tasks', auth, projectsController.createTask);
router.put('/:id/tasks/:taskId', auth, projectsController.updateTask);
router.delete('/:id/tasks/:taskId', auth, projectsController.deleteTask);

module.exports = router;
