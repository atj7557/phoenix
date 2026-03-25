import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import phoenixCompatRoutes from './phoenix.compat.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use('/phoenix', phoenixCompatRoutes);

export default router;
