import 'dotenv/config';
import { prisma } from './utils/db';
import express from 'express';
import availabilityRoutes from './routes/availability.routes';
import bookingRoutes from './routes/booking.routes';
import servicesRoutes from './routes/services.routes';

const app = express();
const port = 3000;

app.use(express.json());

// Routes
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/services', servicesRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Route de test
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API de test fonctionnelle'
    });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route non trouvée'
    });
});

// Gestion des erreurs globales
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Erreur globale:', err);
    res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
    console.log(`Test route: http://localhost:${port}/api/test`);
});