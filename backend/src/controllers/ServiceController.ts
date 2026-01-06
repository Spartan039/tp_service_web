import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export class ServiceController {
    /**
     * Récupérer tous les services actifs
     */
    static async getAllServices(req: Request, res: Response): Promise<void> {
        try {
            const services = await prisma.service.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    durationMinutes: true,
                    maxParticipants: true,
                    category: true
                }
            });

            res.json({
                success: true,
                count: services.length,
                data: services
            });
        } catch (error) {
            console.error(' Erreur getAllServices:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des services'
            });
        }
    }

    /**
     * Récupérer un service spécifique
     */
    static async getServiceById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const service = await prisma.service.findUnique({
                where: { id },
                include: {
                    timeSlots: {
                        where: {
                            startTime: { gt: new Date() },
                            isBookable: true,
                            availableSpots: { gt: 0 }
                        },
                        orderBy: { startTime: 'asc' },
                        take: 10,
                        select: {
                            id: true,
                            startTime: true,
                            endTime: true,
                            availableSpots: true
                        }
                    }
                }
            });

            if (!service) {
                res.status(404).json({
                    success: false,
                    error: 'Service non trouvé'
                });
                return;
            }

            if (!service.isActive) {
                res.status(404).json({
                    success: false,
                    error: 'Service non disponible'
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    ...service,
                    upcomingSlots: service.timeSlots.map(slot => ({
                        id: slot.id,
                        date: slot.startTime.toLocaleDateString('fr-CA'),
                        time: slot.startTime.toLocaleTimeString('fr-CA', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        availableSpots: slot.availableSpots
                    }))
                }
            });
        } catch (error) {
            console.error(' Erreur getServiceById:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération du service'
            });
        }
    }
}