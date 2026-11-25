const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`Volunteer Coordination API Server running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/shifts`);
  console.log(`=======================================================`);
});

module.exports = server;
