const express = require('express');
const requestIdMiddleware = require('./middleware/requestId');
const requestLoggerMiddleware = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./errors/AppError');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// 1. Custom Middleware: Request ID generation & header attachment
app.use(requestIdMiddleware);

// 2. Custom Middleware: Structured request/response latency logger
app.use(requestLoggerMiddleware);

// 3. Built-in Middleware: JSON Body Parser
app.use(express.json());

// 4. API Routes
app.use('/api/orders', orderRoutes);

// 5. Catch-All Middleware: Unhandled endpoints trigger operational 404
app.use((req, res, next) => {
  next(AppError.notFound(`Cannot find endpoint '${req.method} ${req.originalUrl}' on this delivery server.`));
});

// 6. Centralized Error Handling Middleware (registered last in pipeline)
app.use(errorHandler);

module.exports = app;
