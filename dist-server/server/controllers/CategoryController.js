"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const Category_1 = require("../models/Category");
exports.CategoryController = {
    async index(req, res) {
        try {
            const categories = await Category_1.CategoryModel.findAll();
            res.json(categories);
        }
        catch (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({ message: 'Erro interno ao buscar categorias.' });
        }
    },
};
