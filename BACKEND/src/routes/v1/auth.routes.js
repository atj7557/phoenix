import { Router } from 'express';
import {
  login,
  me,
  register,
  revokeToken,
} from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);
router.post('/auth/token/revoke', revokeToken);

export default router;
