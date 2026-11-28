const jwt = require('jsonwebtoken');
const AppError = require('../errors/AppError');
const Booking = require('../models/Booking');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_coworking_secret_never_commit_to_prod';
const DEFAULT_EXPIRY = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Generates signed JWT with user identity, role, and expiry timestamp
 *
 * @param {Object} user - User document
 * @param {string} [expiresIn] - Optional custom expiry duration (e.g. '1s' for testing expiry)
 * @returns {string} Signed JWT token
 */
function generateToken(user, expiresIn = null) {
  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn || DEFAULT_EXPIRY
  });
}

/**
 * Authentication Middleware: Verifies JWT signature and expiry
 * Enforces protected route boundary.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      AppError.unauthorized('Authentication token missing. Provide token in Authorization: Bearer <token> format.')
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, name, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        AppError.unauthorized(`JWT token expired at ${err.expiredAt.toISOString()}. Please login again to refresh.`)
      );
    }
    return next(AppError.unauthorized('Invalid JWT token signature or malformed token payload.'));
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to specific role tiers (e.g. ADMIN only).
 *
 * @param {...string} allowedRoles - Roles permitted to access route
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access forbidden: Requires one of [${allowedRoles.join(', ')}] roles. Your current role is '${
            req.user?.role || 'ANONYMOUS'
          }'.`
        )
      );
    }
    next();
  };
}

/**
 * Attribute-Based Access Control (ABAC) / Ownership Check Middleware
 * Enforces that a MEMBER can only cancel or modify their OWN booking,
 * while an ADMIN can override/manage any booking.
 */
async function checkBookingOwnership(req, res, next) {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return next(AppError.notFound(`Booking with ID '${bookingId}' was not found.`));
    }

    // Role check: ADMIN has universal override privileges
    if (req.user.role === 'ADMIN') {
      req.booking = booking;
      return next();
    }

    // Ownership check: MEMBER must match the booking's userId
    if (booking.userId.toString() !== req.user.id.toString()) {
      return next(
        AppError.forbidden(
          `Access forbidden: Booking '${bookingId}' belongs to another member (${booking.userEmail}). You can only manage your own bookings.`
        )
      );
    }

    req.booking = booking;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  authorizeRoles,
  checkBookingOwnership
};
