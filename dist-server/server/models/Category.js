"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryModel = void 0;
const database_1 = __importDefault(require("../config/database"));
exports.CategoryModel = {
    async findAll() {
        const [rows] = await database_1.default.query('SELECT * FROM categories ORDER BY name ASC');
        return rows;
    },
    async findById(id) {
        const [rows] = await database_1.default.query('SELECT * FROM categories WHERE id = ?', [id]);
        return rows[0] || null;
    },
};
