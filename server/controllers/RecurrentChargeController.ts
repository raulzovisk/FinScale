import { Response } from 'express';
import { RecurrentChargeModel } from '../models/RecurrentCharge';
import { AuthRequest } from '../middleware/auth';

export const RecurrentChargeController = {
    async index(req: AuthRequest, res: Response): Promise<void> {
        try {
            const charges = await RecurrentChargeModel.findAllByUser(req.userId!);
            res.json(charges);
        } catch (error) {
            console.error('Erro ao buscar cobranças recorrentes:', error);
            res.status(500).json({ message: 'Erro interno ao buscar cobranças recorrentes.' });
        }
    },

    async store(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { description, amount, frequency, nextDueDate, category, type, card_id } = req.body;

            if (!description || amount == null || !frequency || !nextDueDate) {
                res.status(400).json({ message: 'Campos obrigatórios: description, amount, frequency, nextDueDate.' });
                return;
            }

            const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
            if (!validFrequencies.includes(frequency)) {
                res.status(400).json({ message: 'Frequência deve ser: daily, weekly, monthly ou yearly.' });
                return;
            }

            const charge = await RecurrentChargeModel.create({
                users_id: req.userId!,
                description,
                amount: parseFloat(amount),
                type: type || 'expense',
                frequency,
                next_due_date: nextDueDate,
                category: category || 'recorrente',
                card_id: card_id || null,
            });

            res.status(201).json(charge);
        } catch (error) {
            console.error('Erro ao criar cobrança recorrente:', error);
            res.status(500).json({ message: 'Erro interno ao criar cobrança recorrente.' });
        }
    },

    async toggleActive(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }

            const charge = await RecurrentChargeModel.toggleActive(id, req.userId!);

            if (!charge) {
                res.status(404).json({ message: 'Cobrança recorrente não encontrada.' });
                return;
            }

            res.json(charge);
        } catch (error) {
            console.error('Erro ao alternar status da cobrança:', error);
            res.status(500).json({ message: 'Erro interno ao alternar status.' });
        }
    },

    async destroy(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }

            const deleted = await RecurrentChargeModel.deleteByIdAndUser(id, req.userId!);

            if (!deleted) {
                res.status(404).json({ message: 'Cobrança recorrente não encontrada.' });
                return;
            }

            res.json({ message: 'Cobrança recorrente deletada com sucesso.' });
        } catch (error) {
            console.error('Erro ao deletar cobrança recorrente:', error);
            res.status(500).json({ message: 'Erro interno ao deletar cobrança recorrente.' });
        }
    },
};
