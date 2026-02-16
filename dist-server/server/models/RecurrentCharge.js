"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurrentChargeModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.RecurrentChargeModel = {
    async findAllByUser(userId) {
        const [rows] = await database_1.default.query('SELECT * FROM recurrent_charges WHERE users_id = ? ORDER BY is_active DESC, next_due_date ASC', [userId]);
        return rows;
    },
    async create(data) {
        const [result] = await database_1.default.query('INSERT INTO recurrent_charges (users_id, description, amount, frequency, next_due_date, category) VALUES (?, ?, ?, ?, ?, ?)', [data.users_id, data.description, data.amount, data.frequency, data.next_due_date, data.category]);
        const [rows] = await database_1.default.query('SELECT * FROM recurrent_charges WHERE id = ?', [result.insertId]);
        return rows[0];
    },
    async toggleActive(id, userId) {
        const [result] = await database_1.default.query('UPDATE recurrent_charges SET is_active = NOT is_active WHERE id = ? AND users_id = ?', [id, userId]);
        if (result.affectedRows === 0)
            return null;
        const [rows] = await database_1.default.query('SELECT * FROM recurrent_charges WHERE id = ?', [id]);
        return rows[0];
    },
    async deleteByIdAndUser(id, userId) {
        const [result] = await database_1.default.query('DELETE FROM recurrent_charges WHERE id = ? AND users_id = ?', [id, userId]);
        return result.affectedRows > 0;
    },
};
