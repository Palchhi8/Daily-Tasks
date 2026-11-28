const User = require('../models/User');
const AppError = require('../errors/AppError');
const { generateToken } = require('../middleware/auth');

/**
 * Controller: Register a new user (Member or Admin)
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(AppError.conflict(`An account with email '${email}' is already registered.`));
    }

    const user = await User.create({
      name,
      email,
      password, // Pre-save hook hashes with bcrypt
      role: role || 'MEMBER'
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      requestId: req.id,
      message: 'User account registered successfully.',
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        user
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: User login and JWT token issuance
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Intentionally generic message to prevent account enumeration
      return next(AppError.unauthorized('Invalid email or password credentials.'));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(AppError.unauthorized('Invalid email or password credentials.'));
    }

    // Support custom short expiration for testing token expiry if requested
    const customExpiry = req.query.testExpiry || null;
    const token = generateToken(user, customExpiry);

    res.status(200).json({
      success: true,
      requestId: req.id,
      message: 'Authentication successful.',
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn: customExpiry || process.env.JWT_EXPIRES_IN || '1h',
        user
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Get authenticated user profile (Protected route)
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(AppError.notFound('User profile not found.'));
    }

    res.status(200).json({
      success: true,
      requestId: req.id,
      data: {
        user,
        tokenClaims: {
          role: req.user.role,
          issuedAt: new Date(req.user.iat * 1000).toISOString(),
          expiresAt: new Date(req.user.exp * 1000).toISOString()
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe
};
