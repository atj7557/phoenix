import { Router } from 'express';
import { env } from '../config/env.js';
import v1Routes from './v1/index.js';

const router = Router();

router.use(env.API_PREFIX, v1Routes);

export default router;
