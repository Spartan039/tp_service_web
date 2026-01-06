import { PrismaClient } from '@prisma/client';

// Instance globale de Prisma
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Fonction pour tester la connexion
export async function testDatabaseConnection(): Promise<boolean> {
    try {
        await prisma.$connect();
        console.log(' Connexion à la base de données réussie');
        return true;
    } catch (error) {
        console.error(' Erreur de connexion à la base de données:', error);
        return false;
    }
}

// Fonction pour fermer proprement la connexion
export async function closeDatabaseConnection(): Promise<void> {
    await prisma.$disconnect();
    console.log(' Connexion à la base de données fermée');