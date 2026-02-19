import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CardRow extends RowDataPacket {
    id: number;
    users_id: number;
    name: string;
    last_digits: string | null;
    color: string;
    initial_balance: number;
    created_at: string;
}

export interface CardWithBalance extends CardRow {
    current_balance: number;
    total_income: number;
    total_expense: number;
}

export const CardModel = {
    async findAllByUser(userId: number): Promise<CardWithBalance[]> {
        const [rows] = await pool.query<CardWithBalance[]>(`
            SELECT 
                c.*,
                c.initial_balance 
                    + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)
                    - COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) 
                    AS current_balance,
                COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense
            FROM cards c
            LEFT JOIN transactions t ON t.card_id = c.id AND t.users_id = c.users_id
            WHERE c.users_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [userId]);
        return rows;
    },

    async findById(id: number, userId: number): Promise<CardRow | null> {
        const [rows] = await pool.query<CardRow[]>(
            'SELECT * FROM cards WHERE id = ? AND users_id = ?',
            [id, userId]
        );
        return rows[0] || null;
    },

    async create(data: {
        users_id: number;
        name: string;
        last_digits?: string;
        color?: string;
        initial_balance?: number;
    }): Promise<CardRow> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO cards (users_id, name, last_digits, color, initial_balance) VALUES (?, ?, ?, ?, ?)',
            [
                data.users_id,
                data.name,
                data.last_digits || null,
                data.color || '#6366f1',
                data.initial_balance || 0,
            ]
        );

        const [rows] = await pool.query<CardRow[]>(
            'SELECT * FROM cards WHERE id = ?',
            [result.insertId]
        );

        return rows[0];
    },

    async update(id: number, userId: number, data: {
        name?: string;
        last_digits?: string;
        color?: string;
        initial_balance?: number;
    }): Promise<CardRow | null> {
        const fields: string[] = [];
        const values: any[] = [];

        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.last_digits !== undefined) { fields.push('last_digits = ?'); values.push(data.last_digits); }
        if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
        if (data.initial_balance !== undefined) { fields.push('initial_balance = ?'); values.push(data.initial_balance); }

        if (fields.length === 0) return this.findById(id, userId);

        values.push(id, userId);

        await pool.query<ResultSetHeader>(
            `UPDATE cards SET ${fields.join(', ')} WHERE id = ? AND users_id = ?`,
            values
        );

        return this.findById(id, userId);
    },

    async deleteByIdAndUser(id: number, userId: number): Promise<boolean> {
        // Set card_id to NULL on related transactions before deleting
        await pool.query('UPDATE transactions SET card_id = NULL WHERE card_id = ? AND users_id = ?', [id, userId]);

        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM cards WHERE id = ? AND users_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    },
};
