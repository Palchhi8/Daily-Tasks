const Room = require('../models/Room');
const AppError = require('../errors/AppError');

/**
 * Controller: List all coworking rooms
 * GET /api/rooms
 */
async function listRooms(req, res, next) {
  try {
    const rooms = await Room.find().lean();
    res.status(200).json({
      success: true,
      requestId: req.id,
      count: rooms.length,
      data: rooms
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Create a new coworking room (Admin only)
 * POST /api/rooms
 */
async function createRoom(req, res, next) {
  try {
    const { roomId, name, capacity, amenities, hourlyRate } = req.body;

    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return next(AppError.conflict(`Room with ID '${roomId}' already exists.`));
    }

    const room = await Room.create({
      roomId,
      name,
      capacity,
      amenities: amenities || [],
      hourlyRate
    });

    res.status(201).json({
      success: true,
      requestId: req.id,
      message: `Coworking room '${room.name}' created successfully.`,
      data: room
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRooms,
  createRoom
};
