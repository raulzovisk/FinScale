import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

export interface CategoryRow extends RowDataPacket {
    id: number;
    name: string;
    color: string;
    icon: string;
}

export const CategoryModel = {
    async findAll(): Promise<CategoryRow[]> {
        const [rows] = await pool.query<CategoryRow[]>(
            'SELECT * FROM categories ORDER BY name ASC'
        );
        return rows;
    },

    async findById(id: number): Promise<CategoryRow | null> {
        const [rows] = await pool.query<CategoryRow[]>(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },
};
