const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { z } = require('zod');
const validate = require('../middleware/validate');

const createRoomSchema = z.object({
  roomId: z.string().min(3).max(50),
  name: z.string().min(3).max(100),
  capacity: z.number().int().positive(),
  amenities: z.array(z.string()).optional(),
  hourlyRate: z.number().positive()
});

// GET /api/rooms - Accessible to authenticated users (or public list)
router.get('/', authenticateToken, roomController.listRooms);

// POST /api/rooms - Restricted to ADMIN role only
router.post(
  '/',
  authenticateToken,
  authorizeRoles('ADMIN'),
  validate(createRoomSchema, 'body'),
  roomController.createRoom
);

module.exports = router;
