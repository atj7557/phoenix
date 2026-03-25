import { Router } from 'express';
import {
  login,
  me,
  register,
  revokeToken,
} from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';

/**
 * Same query-style actions as PHP ms_register.php (path without .php).
 * Example: POST {API_PREFIX}/phoenix/ms_register?action=api.login
 */
const router = Router();

router.post('/ms_register', (req, res, next) => {
  const action = req.query.action;
  if (action === 'api.register') return register(req, res, next);
  if (action === 'api.login') return login(req, res, next);
  if (action === 'api.token.revoke') return revokeToken(req, res, next);
  return res.status(400).json({ success: false, message: 'Unknown or missing action' });
});

router.get('/ms_register', (req, res, next) => {
  if (req.query.action === 'api.me') {
    return requireAuth(req, res, () => me(req, res, next));
  }
  return res.status(400).json({ success: false, message: 'Unknown or missing action' });
});

export default router;
