import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface TransactionRow extends RowDataPacket {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    created_at: string;
    users_id: number;
}

export const TransactionModel = {
    async findAllByUser(userId: number): Promise<TransactionRow[]> {
        const [rows] = await pool.query<TransactionRow[]>(
            'SELECT * FROM transactions WHERE users_id = ? ORDER BY date DESC, created_at DESC',
            [userId]
        );
        return rows;
    },

    async create(data: {
        users_id: number;
        description: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        date: string;
    }): Promise<TransactionRow> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO transactions (users_id, description, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?)',
            [data.users_id, data.description, data.amount, data.type, data.category, data.date]
        );

        const [rows] = await pool.query<TransactionRow[]>(
            'SELECT * FROM transactions WHERE id = ?',
            [result.insertId]
        );

        return rows[0];
    },

    async deleteByIdAndUser(id: number, userId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM transactions WHERE id = ? AND users_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    },

    async getSummaryByUser(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance
      FROM transactions
      WHERE users_id = ?
    `, [userId]);

        return rows[0] as { totalIncome: number; totalExpense: number; balance: number };
    },
};
