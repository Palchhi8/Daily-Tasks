const express = require('express');
const requestIdMiddleware = require('./middleware/requestId');
const requestLoggerMiddleware = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./errors/AppError');
const shiftRoutes = require('./routes/shiftRoutes');

const app = express();

// 1. Custom Middleware: Request ID generation & header attachment
app.use(requestIdMiddleware);

// 2. Custom Middleware: Structured request/response latency logger
app.use(requestLoggerMiddleware);

// 3. Built-in Middleware: JSON Body Parser
app.use(express.json());

// 4. API Routes
app.use('/api/shifts', shiftRoutes);

// 5. Catch-All Middleware: Unhandled endpoints trigger operational 404
app.use((req, res, next) => {
  next(AppError.notFound(`Cannot find endpoint '${req.method} ${req.originalUrl}' on this server.`));
});

// 6. Centralized Error Handling Middleware (must be registered last)
app.use(errorHandler);

module.exports = app;
