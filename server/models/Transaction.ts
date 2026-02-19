import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';

export interface TransactionRow extends RowDataPacket {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    created_at: string;
    users_id: number;
    installment_id: string | null;
    installment_number: number | null;
    installment_total: number | null;
    card_id: number | null;
    card_name: string | null;
}

export const TransactionModel = {
    async findAllByUser(userId: number): Promise<TransactionRow[]> {
        const [rows] = await pool.query<TransactionRow[]>(
            `SELECT t.*, c.name AS card_name 
             FROM transactions t 
             LEFT JOIN cards c ON t.card_id = c.id 
             WHERE t.users_id = ? 
             ORDER BY t.date DESC, t.created_at DESC`,
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
        installment_id?: string;
        installment_number?: number;
        installment_total?: number;
        card_id?: number;
    }): Promise<TransactionRow> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO transactions (users_id, description, amount, type, category, date, installment_id, installment_number, installment_total, card_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [data.users_id, data.description, data.amount, data.type, data.category, data.date,
            data.installment_id || null, data.installment_number || null, data.installment_total || null,
            data.card_id || null]
        );

        const [rows] = await pool.query<TransactionRow[]>(
            `SELECT t.*, c.name AS card_name FROM transactions t LEFT JOIN cards c ON t.card_id = c.id WHERE t.id = ?`,
            [result.insertId]
        );

        return rows[0];
    },

    async createInstallments(data: {
        users_id: number;
        description: string;
        totalAmount: number;
        type: 'income' | 'expense';
        category: string;
        date: string;
        installments: number;
        card_id?: number;
    }): Promise<TransactionRow[]> {
        const installmentId = crypto.randomUUID();
        const baseAmount = Math.floor((data.totalAmount / data.installments) * 100) / 100;
        const remainder = Math.round((data.totalAmount - baseAmount * data.installments) * 100) / 100;

        const created: TransactionRow[] = [];
        const startDate = new Date(data.date + 'T12:00:00');

        for (let i = 0; i < data.installments; i++) {
            // Calcular data da parcela (mesmo dia, mês seguinte)
            const installDate = new Date(startDate);
            installDate.setMonth(installDate.getMonth() + i);

            const dateStr = `${installDate.getFullYear()}-${String(installDate.getMonth() + 1).padStart(2, '0')}-${String(installDate.getDate()).padStart(2, '0')}`;

            // Última parcela recebe a diferença de arredondamento
            const amount = i === data.installments - 1 ? baseAmount + remainder : baseAmount;

            const tx = await this.create({
                users_id: data.users_id,
                description: `${data.description} (${i + 1}/${data.installments})`,
                amount,
                type: data.type,
                category: data.category,
                date: dateStr,
                installment_id: installmentId,
                installment_number: i + 1,
                installment_total: data.installments,
                card_id: data.card_id,
            });

            created.push(tx);
        }

        return created;
    },

    async deleteByIdAndUser(id: number, userId: number): Promise<boolean> {
        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM transactions WHERE id = ? AND users_id = ?',
            [id, userId]
        );
        return result.affectedRows > 0;
    },

    async getSummaryByUser(userId: number): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-indexed
        const today = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

        const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance
      FROM transactions
      WHERE users_id = ?
        AND date >= ?
        AND date <= ?
    `, [userId, monthStart, today]);

        return rows[0] as { totalIncome: number; totalExpense: number; balance: number };
    },
};
