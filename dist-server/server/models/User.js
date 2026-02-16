"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.UserModel = {
    async findByEmail(email) {
        const [rows] = await database_1.default.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0] || null;
    },
    async findById(id) {
        const [rows] = await database_1.default.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    },
    async findByTelegramId(telegramId) {
        const [rows] = await database_1.default.query('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        return rows[0] || null;
    },
    async linkTelegram(userId, telegramId) {
        await database_1.default.query('UPDATE users SET telegram_id = ? WHERE id = ?', [telegramId, userId]);
    },
    async create(data) {
        const [result] = await database_1.default.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [data.name, data.email, data.password]);
        const [rows] = await database_1.default.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [result.insertId]);
        return rows[0];
    },
};
