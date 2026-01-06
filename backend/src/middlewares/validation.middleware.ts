import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Schéma de validation pour une réservation
 */
export const bookingSchema = z.object({
    timeSlotId: z.string().uuid('ID de créneau invalide'),
    serviceId: z.string().uuid('ID de service invalide'),
    guestEmail: z.string().email('Email invalide'),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    participantCount: z.number()
        .int('Nombre de participants doit être un entier')
        .min(1, 'Minimum 1 participant')
        .max(20, 'Maximum 20 participants'),
    specialRequests: z.string().max(500, 'Maximum 500 caractères').optional()
});

/**
 * Middleware de validation pour les réservations
 */
export const validateBooking = (req: Request, res: Response, next: NextFunction): void => {
    try {
        bookingSchema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Données invalides',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erreur de validation'
            });
        }
    }
};