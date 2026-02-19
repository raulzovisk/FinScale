import { Router } from 'express';
import transactionRoutes from './transactionRoutes';
import categoryRoutes from './categoryRoutes';
import authRoutes from './authRoutes';
import recurrentChargeRoutes from './recurrentChargeRoutes';
import telegramRoutes from './telegramRoutes';
import cardRoutes from './cardRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/categories', categoryRoutes);
router.use('/recurrent-charges', recurrentChargeRoutes);
router.use('/telegram', telegramRoutes);
router.use('/cards', cardRoutes);

export default router;
