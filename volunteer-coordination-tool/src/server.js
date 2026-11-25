require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedShiftsIfEmpty } = require('./controllers/shiftController');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    await seedShiftsIfEmpty();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`Volunteer Coordination API Server running on port ${PORT}`);
      console.log(`Connected to MongoDB Atlas: volunteer_coordination_db`);
      console.log(`Endpoint: http://localhost:${PORT}/api/shifts`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
