import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { RecurrentChargeController } from '../controllers/RecurrentChargeController';
import { RecurrenceService } from '../services/RecurrenceService';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Todas as rotas de cobranças recorrentes requerem autenticação
router.use(authMiddleware);

// Processar cobranças vencidas do usuário logado
router.post('/process', async (req: AuthRequest, res: Response) => {
    try {
        const created = await RecurrenceService.processDueChargesForUser(req.userId!);
        res.json({ processed: created, message: created > 0 ? `${created} transação(ões) gerada(s).` : 'Nenhuma cobrança pendente.' });
    } catch (error) {
        console.error('Erro ao processar recorrências:', error);
        res.status(500).json({ message: 'Erro ao processar cobranças recorrentes.' });
    }
});

router.get('/', RecurrentChargeController.index);
router.post('/', RecurrentChargeController.store);
router.patch('/:id/toggle', RecurrentChargeController.toggleActive);
router.delete('/:id', RecurrentChargeController.destroy);

export default router;
