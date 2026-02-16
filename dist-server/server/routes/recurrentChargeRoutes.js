"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const RecurrentChargeController_1 = require("../controllers/RecurrentChargeController");
const RecurrenceService_1 = require("../services/RecurrenceService");
const router = (0, express_1.Router)();
// Todas as rotas de cobranças recorrentes requerem autenticação
router.use(auth_1.authMiddleware);
// Processar cobranças vencidas do usuário logado
router.post('/process', async (req, res) => {
    try {
        const created = await RecurrenceService_1.RecurrenceService.processDueChargesForUser(req.userId);
        res.json({ processed: created, message: created > 0 ? `${created} transação(ões) gerada(s).` : 'Nenhuma cobrança pendente.' });
    }
    catch (error) {
        console.error('Erro ao processar recorrências:', error);
        res.status(500).json({ message: 'Erro ao processar cobranças recorrentes.' });
    }
});
router.get('/', RecurrentChargeController_1.RecurrentChargeController.index);
router.post('/', RecurrentChargeController_1.RecurrentChargeController.store);
router.patch('/:id/toggle', RecurrentChargeController_1.RecurrentChargeController.toggleActive);
router.delete('/:id', RecurrentChargeController_1.RecurrentChargeController.destroy);
exports.default = router;
