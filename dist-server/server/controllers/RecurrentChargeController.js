"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurrentChargeController = void 0;
const RecurrentCharge_1 = require("../models/RecurrentCharge");
exports.RecurrentChargeController = {
    async index(req, res) {
        try {
            const charges = await RecurrentCharge_1.RecurrentChargeModel.findAllByUser(req.userId);
            res.json(charges);
        }
        catch (error) {
            console.error('Erro ao buscar cobranças recorrentes:', error);
            res.status(500).json({ message: 'Erro interno ao buscar cobranças recorrentes.' });
        }
    },
    async store(req, res) {
        try {
            const { description, amount, frequency, nextDueDate, category } = req.body;
            if (!description || amount == null || !frequency || !nextDueDate) {
                res.status(400).json({ message: 'Campos obrigatórios: description, amount, frequency, nextDueDate.' });
                return;
            }
            const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];
            if (!validFrequencies.includes(frequency)) {
                res.status(400).json({ message: 'Frequência deve ser: daily, weekly, monthly ou yearly.' });
                return;
            }
            const charge = await RecurrentCharge_1.RecurrentChargeModel.create({
                users_id: req.userId,
                description,
                amount: parseFloat(amount),
                frequency,
                next_due_date: nextDueDate,
                category: category || 'recorrente',
            });
            res.status(201).json(charge);
        }
        catch (error) {
            console.error('Erro ao criar cobrança recorrente:', error);
            res.status(500).json({ message: 'Erro interno ao criar cobrança recorrente.' });
        }
    },
    async toggleActive(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }
            const charge = await RecurrentCharge_1.RecurrentChargeModel.toggleActive(id, req.userId);
            if (!charge) {
                res.status(404).json({ message: 'Cobrança recorrente não encontrada.' });
                return;
            }
            res.json(charge);
        }
        catch (error) {
            console.error('Erro ao alternar status da cobrança:', error);
            res.status(500).json({ message: 'Erro interno ao alternar status.' });
        }
    },
    async destroy(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }
            const deleted = await RecurrentCharge_1.RecurrentChargeModel.deleteByIdAndUser(id, req.userId);
            if (!deleted) {
                res.status(404).json({ message: 'Cobrança recorrente não encontrada.' });
                return;
            }
            res.json({ message: 'Cobrança recorrente deletada com sucesso.' });
        }
        catch (error) {
            console.error('Erro ao deletar cobrança recorrente:', error);
            res.status(500).json({ message: 'Erro interno ao deletar cobrança recorrente.' });
        }
    },
};
