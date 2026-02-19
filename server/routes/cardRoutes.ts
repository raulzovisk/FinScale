import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { CardController } from '../controllers/CardController';

const router = Router();

// Todas as rotas de cartão requerem autenticação
router.use(authMiddleware);

router.get('/', CardController.index);
router.post('/', CardController.store);
router.put('/:id', CardController.update);
router.delete('/:id', CardController.destroy);

export default router;
