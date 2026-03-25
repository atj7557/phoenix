import { HttpStatus } from '../constants/httpStatus.js';
import {
  findUserById,
  loginUser,
  registerUser,
  toPublicUser,
} from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { getBearerOrQueryToken } from '../middlewares/auth.middleware.js';

export const register = asyncHandler(async (req, res) => {
  await registerUser({
    name: req.body?.name,
    mobile: req.body?.mobile,
    password: req.body?.password,
  });
  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Registered. Waiting for admin approval.',
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser({
    mobile: req.body?.mobile,
    password: req.body?.password,
  });
  res.status(HttpStatus.OK).json({
    success: true,
    token: result.token,
    expires: result.expires,
    token_expires_at: result.token_expires_at,
    user: result.user,
  });
});

export const me = asyncHandler(async (req, res) => {
  const row = await findUserById(req.auth.userId);
  if (!row) {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
  res.status(HttpStatus.OK).json({
    success: true,
    user: toPublicUser(row),
  });
});

/**
 * Stateless JWT: server cannot invalidate before expiry. Client must discard the token.
 * Matches PHP success shape when a valid Bearer was supplied.
 */
export const revokeToken = asyncHandler(async (req, res) => {
  let token = getBearerOrQueryToken(req);
  if (!token && req.body?.token != null) {
    token = String(req.body.token);
  }
  if (!token) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'No token provided and no session found',
    });
  }
  try {
    verifyAccessToken(token);
  } catch {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
  res.status(HttpStatus.OK).json({
    success: true,
    message: 'Token revoked',
  });
});
