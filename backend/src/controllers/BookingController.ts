import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export class BookingController {
    /**
     * Créer une nouvelle réservation
     */
    static async createBooking(req: Request, res: Response): Promise<void> {
        try {
            const {
                timeSlotId,
                serviceId,
                guestEmail,
                guestName,
                guestPhone,
                participantCount,
                specialRequests
            } = req.body;

            // Validation basique
            if (!guestEmail || !guestEmail.includes('@')) {
                res.status(400).json({
                    success: false,
                    error: 'Email invalide'
                });
                return;
            }

            if (!timeSlotId || !serviceId) {
                res.status(400).json({
                    success: false,
                    error: 'Créneau et service requis'
                });
                return;
            }

            if (!participantCount || participantCount < 1) {
                res.status(400).json({
                    success: false,
                    error: 'Nombre de participants invalide'
                });
                return;
            }

            // Vérifier le créneau
            const timeSlot = await prisma.timeSlot.findUnique({
                where: { id: timeSlotId },
                include: { service: true }
            });

            if (!timeSlot || !timeSlot.isBookable) {
                res.status(400).json({
                    success: false,
                    error: 'Créneau non disponible'
                });
                return;
            }

            if (timeSlot.availableSpots < participantCount) {
                res.status(400).json({
                    success: false,
                    error: `Plus que ${timeSlot.availableSpots} place(s) disponible(s)`
                });
                return;
            }

            // Vérifier le service
            const service = await prisma.service.findUnique({
                where: { id: serviceId, isActive: true }
            });

            if (!service) {
                res.status(400).json({
                    success: false,
                    error: 'Service non disponible'
                });
                return;
            }

            // Vérifier le nombre max de participants
            if (participantCount > service.maxParticipants) {
                res.status(400).json({
                    success: false,
                    error: `Maximum ${service.maxParticipants} participants pour ce service`
                });
                return;
            }

            // Calculer le prix total
            const totalPrice = service.price * participantCount;

            // Utiliser une transaction pour garantir l'intégrité
            const booking = await prisma.$transaction(async (tx) => {
                // 1. Créer la réservation
                const newBooking = await tx.booking.create({
                    data: {
                        guestEmail,
                        guestName: guestName || null,
                        guestPhone: guestPhone || null,
                        timeSlotId,
                        serviceId,
                        participantCount,
                        totalPrice,
                        specialRequests: specialRequests || null,
                        status: 'CONFIRMED'
                    },
                    include: {
                        service: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                durationMinutes: true
                            }
                        },
                        timeSlot: {
                            select: {
                                id: true,
                                startTime: true,
                                endTime: true
                            }
                        }
                    }
                });

                // 2. Mettre à jour les places disponibles
                await tx.timeSlot.update({
                    where: { id: timeSlotId },
                    data: {
                        availableSpots: {
                            decrement: participantCount
                        }
                    }
                });

                return newBooking;
            });

            res.status(201).json({
                success: true,
                message: 'Réservation confirmée !',
                data: booking,
                summary: {
                    participants: participantCount,
                    total: `${totalPrice}$`,
                    date: booking.timeSlot.startTime.toLocaleDateString('fr-CA'),
                    time: booking.timeSlot.startTime.toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }
            });
        } catch (error) {
            console.error(' Erreur createBooking:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de la réservation',
                details: process.env.NODE_ENV === 'development' ? String(error) : undefined
            });
        }
    }

    /**
     * Récupérer les réservations par email
     */
    static async getBookingsByEmail(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.params;

            if (!email || !email.includes('@')) {
                res.status(400).json({
                    success: false,
                    error: 'Email invalide'
                });
                return;
            }

            const bookings = await prisma.booking.findMany({
                where: { guestEmail: email },
                include: {
                    service: {
                        select: {
                            name: true,
                            description: true,
                            price: true
                        }
                    },
                    timeSlot: {
                        select: {
                            startTime: true,
                            endTime: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            res.json({
                success: true,
                count: bookings.length,
                data: bookings.map(booking => ({
                    id: booking.id,
                    guestName: booking.guestName,
                    service: booking.service.name,
                    date: booking.timeSlot.startTime.toLocaleDateString('fr-CA'),
                    time: booking.timeSlot.startTime.toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    participants: booking.participantCount,
                    total: `${booking.totalPrice}$`,
                    status: booking.status,
                    specialRequests: booking.specialRequests,
                    createdAt: booking.createdAt
                }))
            });
        } catch (error) {
            console.error(' Erreur getBookingsByEmail:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des réservations'
            });
        }
    }

    /**
     * Annuler une réservation
     */
    static async cancelBooking(req: Request, res: Response): Promise<void> {
        try {
            const { id, email } = req.params;

            if (!email || !email.includes('@')) {
                res.status(400).json({
                    success: false,
                    error: 'Email invalide'
                });
                return;
            }

            // Vérifier que la réservation existe et appartient à l'email
            const booking = await prisma.booking.findUnique({
                where: { id },
                include: {
                    timeSlot: true,
                    service: {
                        select: { name: true }
                    }
                }
            });

            if (!booking) {
                res.status(404).json({
                    success: false,
                    error: 'Réservation non trouvée'
                });
                return;
            }

            if (booking.guestEmail !== email) {
                res.status(403).json({
                    success: false,
                    error: 'Cette réservation ne vous appartient pas'
                });
                return;
            }

            if (booking.status === 'CANCELLED') {
                res.status(400).json({
                    success: false,
                    error: 'Réservation déjà annulée'
                });
                return;
            }

            // Vérifier si la réservation n'est pas dans le passé
            if (booking.timeSlot.startTime < new Date()) {
                res.status(400).json({
                    success: false,
                    error: 'Impossible d\'annuler une réservation passée'
                });
                return;
            }

            // Annuler la réservation et rendre les places
            const cancelledBooking = await prisma.$transaction(async (tx) => {
                // 1. Annuler la réservation
                const updatedBooking = await tx.booking.update({
                    where: { id },
                    data: { status: 'CANCELLED' }
                });

                // 2. Rendre les places disponibles
                await tx.timeSlot.update({
                    where: { id: booking.timeSlotId },
                    data: {
                        availableSpots: {
                            increment: booking.participantCount
                        }
                    }
                });

                return updatedBooking;
            });

            res.json({
                success: true,
                message: 'Réservation annulée avec succès',
                data: {
                    id: cancelledBooking.id,
                    status: cancelledBooking.status,
                    refund: `${cancelledBooking.totalPrice}$`,
                    service: booking.service.name,
                    message: 'Les places ont été remises en vente'
                }
            });
        } catch (error) {
            console.error(' Erreur cancelBooking:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'annulation de la réservation'
            });
        }
    }
}