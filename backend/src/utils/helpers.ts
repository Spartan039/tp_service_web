/**
 * Valide un email
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Formate une date au format français
 */
export const formatDateFR = (date: Date): string => {
    return date.toLocaleDateString('fr-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Formate une date et heure
 */
export const formatDateTimeFR = (date: Date): string => {
    return date.toLocaleString('fr-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Calcule la durée entre deux dates en minutes
 */
export const calculateDuration = (start: Date, end: Date): number => {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
};

/**
 * Génère un message de confirmation de réservation
 */
export const generateConfirmationMessage = (booking: any): string => {
    return `
 RÉSERVATION CONFIRMÉE !

Bonjour ${booking.guestName || 'Client'},

Votre réservation pour "${booking.service.name}" a bien été confirmée.

 Détails :
- Date : ${formatDateFR(booking.timeSlot.startTime)}
- Heure : ${booking.timeSlot.startTime.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
- Participants : ${booking.participantCount} personne(s)
- Prix total : ${booking.totalPrice}€
- Référence : ${booking.id}

 Adresse du ranch : [Votre adresse ici]
 Contact : [Votre téléphone ici]

Nous avons hâte de vous accueillir !

L'équipe du Ranch Équestre
  `.trim();
};