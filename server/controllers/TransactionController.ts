import { Response } from 'express';
import { TransactionModel } from '../models/Transaction';
import { AuthRequest } from '../middleware/auth';

export const TransactionController = {
    async index(req: AuthRequest, res: Response): Promise<void> {
        try {
            const transactions = await TransactionModel.findAllByUser(req.userId!);
            res.json(transactions);
        } catch (error) {
            console.error('Erro ao buscar transações:', error);
            res.status(500).json({ message: 'Erro interno ao buscar transações.' });
        }
    },

    async store(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { description, amount, type, category, date } = req.body;

            if (!description || amount == null || !type || !category || !date) {
                res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
                return;
            }

            if (!['income', 'expense'].includes(type)) {
                res.status(400).json({ message: 'Tipo deve ser "income" ou "expense".' });
                return;
            }

            const transaction = await TransactionModel.create({
                users_id: req.userId!,
                description,
                amount: parseFloat(amount),
                type,
                category,
                date,
            });

            res.status(201).json(transaction);
        } catch (error) {
            console.error('Erro ao criar transação:', error);
            res.status(500).json({ message: 'Erro interno ao criar transação.' });
        }
    },

    async destroy(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }

            const deleted = await TransactionModel.deleteByIdAndUser(id, req.userId!);

            if (!deleted) {
                res.status(404).json({ message: 'Transação não encontrada.' });
                return;
            }

            res.json({ message: 'Transação deletada com sucesso.' });
        } catch (error) {
            console.error('Erro ao deletar transação:', error);
            res.status(500).json({ message: 'Erro interno ao deletar transação.' });
        }
    },

    async summary(req: AuthRequest, res: Response): Promise<void> {
        try {
            const summaryData = await TransactionModel.getSummaryByUser(req.userId!);
            res.json(summaryData);
        } catch (error) {
            console.error('Erro ao buscar resumo:', error);
            res.status(500).json({ message: 'Erro interno ao buscar resumo.' });
        }
    },
};
