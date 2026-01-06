import express from 'express';
import { AvailabilityController } from '../controllers/AvailabilityController';

const router = express.Router();

// GET /api/availability/service/:serviceId - Disponibilités d'un service
router.get('/service/:serviceId', AvailabilityController.getServiceAvailability);

// GET /api/availability/calendar/:year/:month - Calendrier mensuel
router.get('/calendar/:year/:month', AvailabilityController.getMonthlyCalendar);

export default router;