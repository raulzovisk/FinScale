import { Response } from 'express';
import { CardModel } from '../models/Card';
import { AuthRequest } from '../middleware/auth';

export const CardController = {
    async index(req: AuthRequest, res: Response): Promise<void> {
        try {
            const cards = await CardModel.findAllByUser(req.userId!);
            res.json(cards);
        } catch (error) {
            console.error('Erro ao buscar cartões:', error);
            res.status(500).json({ message: 'Erro interno ao buscar cartões.' });
        }
    },

    async store(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, last_digits, color, initial_balance } = req.body;

            if (!name) {
                res.status(400).json({ message: 'O nome do cartão é obrigatório.' });
                return;
            }

            if (last_digits && (last_digits.length > 4 || !/^\d+$/.test(last_digits))) {
                res.status(400).json({ message: 'Últimos dígitos devem ter no máximo 4 números.' });
                return;
            }

            const card = await CardModel.create({
                users_id: req.userId!,
                name,
                last_digits,
                color,
                initial_balance: parseFloat(initial_balance) || 0,
            });

            res.status(201).json(card);
        } catch (error) {
            console.error('Erro ao criar cartão:', error);
            res.status(500).json({ message: 'Erro interno ao criar cartão.' });
        }
    },

    async update(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }

            const { name, last_digits, color, initial_balance } = req.body;

            const card = await CardModel.update(id, req.userId!, {
                name,
                last_digits,
                color,
                initial_balance: initial_balance !== undefined ? parseFloat(initial_balance) : undefined,
            });

            if (!card) {
                res.status(404).json({ message: 'Cartão não encontrado.' });
                return;
            }

            res.json(card);
        } catch (error) {
            console.error('Erro ao atualizar cartão:', error);
            res.status(500).json({ message: 'Erro interno ao atualizar cartão.' });
        }
    },

    async destroy(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }

            const deleted = await CardModel.deleteByIdAndUser(id, req.userId!);

            if (!deleted) {
                res.status(404).json({ message: 'Cartão não encontrado.' });
                return;
            }

            res.json({ message: 'Cartão deletado com sucesso.' });
        } catch (error) {
            console.error('Erro ao deletar cartão:', error);
            res.status(500).json({ message: 'Erro interno ao deletar cartão.' });
        }
    },
};
