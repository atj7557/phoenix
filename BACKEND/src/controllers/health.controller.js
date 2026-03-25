import { HttpStatus } from '../constants/httpStatus.js';
import { getHealthPayload } from '../services/health.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthCheck = asyncHandler(async (_req, res) => {
  const data = await getHealthPayload();
  res.status(HttpStatus.OK).json({
    success: true,
    data,
  });
});
