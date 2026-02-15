import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { TransactionController } from '../controllers/TransactionController';

const router = Router();

// Todas as rotas de transação requerem autenticação
router.use(authMiddleware);

router.get('/summary', TransactionController.summary);
router.get('/', TransactionController.index);
router.post('/', TransactionController.store);
router.delete('/:id', TransactionController.destroy);

export default router;
