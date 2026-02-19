"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const Transaction_1 = require("../models/Transaction");
exports.TransactionController = {
    async index(req, res) {
        try {
            const transactions = await Transaction_1.TransactionModel.findAllByUser(req.userId);
            res.json(transactions);
        }
        catch (error) {
            console.error('Erro ao buscar transações:', error);
            res.status(500).json({ message: 'Erro interno ao buscar transações.' });
        }
    },
    async store(req, res) {
        try {
            const { description, amount, type, category, date, installments } = req.body;
            if (!description || amount == null || !type || !category || !date) {
                res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
                return;
            }
            if (!['income', 'expense'].includes(type)) {
                res.status(400).json({ message: 'Tipo deve ser "income" ou "expense".' });
                return;
            }
            const numInstallments = parseInt(installments) || 1;
            if (numInstallments > 1) {
                const transactions = await Transaction_1.TransactionModel.createInstallments({
                    users_id: req.userId,
                    description,
                    totalAmount: parseFloat(amount),
                    type,
                    category,
                    date,
                    installments: numInstallments,
                });
                res.status(201).json(transactions);
            }
            else {
                const transaction = await Transaction_1.TransactionModel.create({
                    users_id: req.userId,
                    description,
                    amount: parseFloat(amount),
                    type,
                    category,
                    date,
                });
                res.status(201).json(transaction);
            }
        }
        catch (error) {
            console.error('Erro ao criar transação:', error);
            res.status(500).json({ message: 'Erro interno ao criar transação.' });
        }
    },
    async destroy(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({ message: 'ID inválido.' });
                return;
            }
            const deleted = await Transaction_1.TransactionModel.deleteByIdAndUser(id, req.userId);
            if (!deleted) {
                res.status(404).json({ message: 'Transação não encontrada.' });
                return;
            }
            res.json({ message: 'Transação deletada com sucesso.' });
        }
        catch (error) {
            console.error('Erro ao deletar transação:', error);
            res.status(500).json({ message: 'Erro interno ao deletar transação.' });
        }
    },
    async summary(req, res) {
        try {
            const summaryData = await Transaction_1.TransactionModel.getSummaryByUser(req.userId);
            res.json(summaryData);
        }
        catch (error) {
            console.error('Erro ao buscar resumo:', error);
            res.status(500).json({ message: 'Erro interno ao buscar resumo.' });
        }
    },
};
