"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.TransactionModel = {
    async findAllByUser(userId) {
        const [rows] = await database_1.default.query('SELECT * FROM transactions WHERE users_id = ? ORDER BY date DESC, created_at DESC', [userId]);
        return rows;
    },
    async create(data) {
        const [result] = await database_1.default.query('INSERT INTO transactions (users_id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?)', [data.users_id, data.description, data.amount, data.type, data.category, data.date]);
        const [rows] = await database_1.default.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
        return rows[0];
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
