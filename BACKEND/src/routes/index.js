import { Router } from 'express';
import { env } from '../config/env.js';
import v1Routes from './v1/index.js';

const router = Router();

const welcomePayload = {
  success: true,
  message: 'Welcome to Phoneix backend',
  apiBase: env.API_PREFIX,
  health: `${env.API_PREFIX}/health`,
};

router.get('/', (_req, res) => {
  res.json(welcomePayload);
});

router.get(env.API_PREFIX, (_req, res) => {
  res.json(welcomePayload);
});

router.use(env.API_PREFIX, v1Routes);

export default router;
