import { Request, Response } from 'express';
import { prisma } from '../utils/db';

export class AvailabilityController {
    /**
     * Récupérer les disponibilités pour un service
     */
    static async getServiceAvailability(req: Request, res: Response): Promise<void> {
        try {
            const { serviceId } = req.params;
            const { date, days = '7' } = req.query;

            // Vérifier le service
            const service = await prisma.service.findUnique({
                where: { id: serviceId, isActive: true }
            });

            if (!service) {
                res.status(404).json({
                    success: false,
                    error: 'Service non trouvé'
                });
                return;
            }

            // Calculer la période
            const startDate = date
                ? new Date(date as string)
                : new Date();

            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + parseInt(days as string));

            // Récupérer les créneaux disponibles
            const timeSlots = await prisma.timeSlot.findMany({
                where: {
                    serviceId,
                    startTime: {
                        gte: startDate,
                        lt: endDate
                    },
                    isBookable: true,
                    availableSpots: { gt: 0 }
                },
                orderBy: { startTime: 'asc' },
                select: {
                    id: true,
                    startTime: true,
                    endTime: true,
                    availableSpots: true
                }
            });

            // Grouper par jour
            const availabilityByDay: Record<string, any[]> = {};

            timeSlots.forEach(slot => {
                const dateKey = slot.startTime.toISOString().split('T')[0];

                if (!availabilityByDay[dateKey]) {
                    availabilityByDay[dateKey] = [];
                }

                availabilityByDay[dateKey].push({
                    id: slot.id,
                    time: slot.startTime.toLocaleTimeString('fr-CA', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    duration: service.durationMinutes,
                    availableSpots: slot.availableSpots,
                    isAvailable: slot.availableSpots > 0
                });
            });

            // Formater les jours
            const daysArray = Object.keys(availabilityByDay)
                .sort()
                .map(dateStr => ({
                    date: dateStr,
                    displayDate: new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-CA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    slots: availabilityByDay[dateStr]
                }));

            res.json({
                success: true,
                service: {
                    id: service.id,
                    name: service.name,
                    price: service.price,
                    duration: service.durationMinutes,
                    maxParticipants: service.maxParticipants
                },
                period: {
                    from: startDate.toISOString().split('T')[0],
                    to: endDate.toISOString().split('T')[0],
                    days: parseInt(days as string)
                },
                availability: daysArray,
                totalSlots: timeSlots.length
            });
        } catch (error) {
            console.error(' Erreur getServiceAvailability:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des disponibilités',
                details: process.env.NODE_ENV === 'development' ? String(error) : undefined
            });
        }
    }

    /**
     * Récupérer le calendrier mensuel
     */
    static async getMonthlyCalendar(req: Request, res: Response): Promise<void> {
        try {
            const { year, month } = req.params;
            const yearNum = parseInt(year);
            const monthNum = parseInt(month) - 1; // JS months are 0-indexed

            // Validation
            if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
                res.status(400).json({
                    success: false,
                    error: 'Année ou mois invalide'
                });
                return;
            }

            // Dates de début et fin du mois
            const startDate = new Date(yearNum, monthNum, 1);
            const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);

            // Récupérer tous les services actifs
            const services = await prisma.service.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    category: true
                },
                orderBy: { name: 'asc' }
            });

            // Pour chaque service, compter les disponibilités par jour
            const calendarData = await Promise.all(
                services.map(async (service) => {
                    const timeSlots = await prisma.timeSlot.findMany({
                        where: {
                            serviceId: service.id,
                            startTime: {
                                gte: startDate,
                                lte: endDate
                            },
                            isBookable: true,
                            availableSpots: { gt: 0 }
                        },
                        select: {
                            startTime: true,
                            availableSpots: true
                        }
                    });

                    // Compter par jour
                    const availabilityByDay: Record<string, number> = {};
                    timeSlots.forEach(slot => {
                        const dateStr = slot.startTime.toISOString().split('T')[0];
                        availabilityByDay[dateStr] = (availabilityByDay[dateStr] || 0) + 1;
                    });

                    return {
                        service,
                        availabilityByDay
                    };
                })
            );

            // Générer le calendrier
            const calendar: Array<{
                date: string;
                day: number;
                weekday: string;
                services: Array<{ name: string, slots: number, hasAvailability: boolean }>
            }> = [];

            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];

                const dayData = {
                    date: dateStr,
                    day: currentDate.getDate(),
                    weekday: currentDate.toLocaleDateString('fr-CA', { weekday: 'short' }),
                    services: calendarData.map(data => ({
                        name: data.service.name,
                        slots: data.availabilityByDay[dateStr] || 0,
                        hasAvailability: (data.availabilityByDay[dateStr] || 0) > 0
                    }))
                };

                calendar.push(dayData);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            res.json({
                success: true,
                month: {
                    year: yearNum,
                    month: monthNum + 1,
                    name: new Date(yearNum, monthNum, 1).toLocaleDateString('fr-CA', {
                        month: 'long',
                        year: 'numeric'
                    })
                },
                services: services.map(s => ({ id: s.id, name: s.name })),
                calendar,
                summary: {
                    totalServices: services.length,
                    totalDays: calendar.length,
                    daysWithAvailability: calendar.filter(day =>
                        day.services.some(s => s.hasAvailability)
                    ).length
                }
            });
        } catch (error) {
            console.error(' Erreur getMonthlyCalendar:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la génération du calendrier',
                details: process.env.NODE_ENV === 'development' ? String(error) : undefined
            });
        }
    }
}