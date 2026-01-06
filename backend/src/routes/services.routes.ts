import express from 'express';
import { ServiceController } from '../controllers/ServiceController';

const router = express.Router();

// GET /api/services - Liste des services
router.get('/', ServiceController.getAllServices);

// GET /api/services/:id - Détails d'un service
router.get('/:id', ServiceController.getServiceById);

export default router;