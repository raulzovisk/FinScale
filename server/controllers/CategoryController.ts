import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category';

export const CategoryController = {
    async index(req: Request, res: Response): Promise<void> {
        try {
            const categories = await CategoryModel.findAll();
            res.json(categories);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({ message: 'Erro interno ao buscar categorias.' });
        }
    },
};
