import express from 'express';
import { BookingController } from '../controllers/BookingController';

const router = express.Router();

// POST /api/bookings - Créer une réservation
router.post('/', BookingController.createBooking);

// GET /api/bookings/email/:email - Voir ses réservations
router.get('/email/:email', BookingController.getBookingsByEmail);

// PATCH /api/bookings/:id/cancel/:email - Annuler une réservation
router.patch('/:id/cancel/:email', BookingController.cancelBooking);

export default router;