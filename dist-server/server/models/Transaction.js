"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = void 0;
const database_1 = __importDefault(require("../config/database"));
const crypto_1 = __importDefault(require("crypto"));
exports.TransactionModel = {
    async findAllByUser(userId) {
        const [rows] = await database_1.default.query('SELECT * FROM transactions WHERE users_id = ? ORDER BY date DESC, created_at DESC', [userId]);
        return rows;
    },
    async create(data) {
        const [result] = await database_1.default.query('INSERT INTO transactions (users_id, description, amount, type, category, date, installment_id, installment_number, installment_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [data.users_id, data.description, data.amount, data.type, data.category, data.date,
            data.installment_id || null, data.installment_number || null, data.installment_total || null]);
        const [rows] = await database_1.default.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async createInstallments(data) {
        const installmentId = crypto_1.default.randomUUID();
        const baseAmount = Math.floor((data.totalAmount / data.installments) * 100) / 100;
        const remainder = Math.round((data.totalAmount - baseAmount * data.installments) * 100) / 100;
        const created = [];
        const startDate = new Date(data.date + 'T12:00:00');
        for (let i = 0; i < data.installments; i++) {
            // Calcular data da parcela (mesmo dia, mês seguinte)
            const installDate = new Date(startDate);
            installDate.setMonth(installDate.getMonth() + i);
            const dateStr = `${installDate.getFullYear()}-${String(installDate.getMonth() + 1).padStart(2, '0')}-${String(installDate.getDate()).padStart(2, '0')}`;
            // Última parcela recebe a diferença de arredondamento
            const amount = i === data.installments - 1 ? baseAmount + remainder : baseAmount;
            const tx = await this.create({
                users_id: data.users_id,
                description: `${data.description} (${i + 1}/${data.installments})`,
                amount,
                type: data.type,
                category: data.category,
                date: dateStr,
                installment_id: installmentId,
                installment_number: i + 1,
                installment_total: data.installments,
            });
            created.push(tx);
        }
        return created;
    },
    async deleteByIdAndUser(id, userId) {
        const [result] = await database_1.default.query('DELETE FROM transactions WHERE id = ? AND users_id = ?', [id, userId]);
        return result.affectedRows > 0;
    },
    async getSummaryByUser(userId) {
        const [rows] = await database_1.default.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance
      FROM transactions
      WHERE users_id = ?
    `, [userId]);
        return rows[0];
    },
};
