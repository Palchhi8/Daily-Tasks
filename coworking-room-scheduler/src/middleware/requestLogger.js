function requestLoggerMiddleware(req, res, next) {
  const startHrTime = process.hrtime();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] [REQ-START] [${req.id}] ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    const status = res.statusCode;
    const statusLabel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'OK';

    console.log(
      `[${new Date().toISOString()}] [REQ-END]   [${req.id}] ${req.method} ${req.originalUrl} -> ${status} ${statusLabel} (${durationMs}ms)`
    );
  });

  next();
}

module.exports = requestLoggerMiddleware;
