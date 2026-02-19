import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface RecurrentChargeRow extends RowDataPacket {
    id: number;
    users_id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    next_due_date: string;
    category: string;
    card_id: number | null;
    is_active: boolean;
    created_at: string;
}

export const RecurrentChargeModel = {
    async findAllByUser(userId: number): Promise<RecurrentChargeRow[]> {
        const [rows] = await pool.query<RecurrentChargeRow[]>(
            'SELECT * FROM recurrent_charges WHERE users_id = ? ORDER BY is_active DESC, next_due_date ASC',
            [userId]
        );
        return rows;
    },

    async create(data: {
        users_id: number;
        description: string;
        amount: number;
        type: 'income' | 'expense';
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        next_due_date: string;
        category: string;
        card_id?: number | null;
    }): Promise<RecurrentChargeRow> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO recurrent_charges (users_id, description, amount, type, frequency, next_due_date, category, card_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [data.users_id, data.description, data.amount, data.type, data.frequency, data.next_due_date, data.category, data.card_id || null]
        );

        const [rows] = await pool.query<RecurrentChargeRow[]>(
            'SELECT * FROM recurrent_charges WHERE id = ?',
            [result.insertId]
        );

        return rows[0];
    },

    async toggleActive(id: number, userId: number): Promise<RecurrentChargeRow | null> {
        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE recurrent_charges SET is_active = NOT is_active WHERE id = ? AND users_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) return null;

        const [rows] = await pool.query<RecurrentChargeRow[]>(
            'SELECT * FROM recurrent_charges WHERE id = ?',
            [id]
        );

        return rows[0];
    },

    async deleteByIdAndUser(id: number, userId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM recurrent_charges WHERE id = ? AND users_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    },
};
