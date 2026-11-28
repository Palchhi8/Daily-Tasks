const express = require('express');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./errors/AppError');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Global Middlewares
app.use(express.json());
app.use(requestId);
app.use(requestLogger);

// Health check / API Index
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Coworking Room Scheduler API',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
});

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

// Catch-all 404 Route (Safe middleware pattern without Express 5 wildcard syntax issue)
app.use((req, res, next) => {
  next(AppError.notFound(`Endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
