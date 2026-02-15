import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UserRow extends RowDataPacket {
    id: number;
    name: string;
    email: string;
    password: string;
    telegram_id: number | null;
    created_at: string;
    updated_at: string;
}

export const UserModel = {
    async findByEmail(email: string): Promise<UserRow | null> {
        const [rows] = await pool.query<UserRow[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    },

    async findById(id: number): Promise<UserRow | null> {
        const [rows] = await pool.query<UserRow[]>(
            'SELECT id, name, email, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    async findByTelegramId(telegramId: number): Promise<UserRow | null> {
        const [rows] = await pool.query<UserRow[]>(
            'SELECT * FROM users WHERE telegram_id = ?',
            [telegramId]
        );
        return rows[0] || null;
    },

    async linkTelegram(userId: number, telegramId: number): Promise<void> {
        await pool.query<ResultSetHeader>(
            'UPDATE users SET telegram_id = ? WHERE id = ?',
            [telegramId, userId]
        );
    },

    async create(data: {
        name: string;
        email: string;
        password: string;
    }): Promise<UserRow> {
        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [data.name, data.email, data.password]
        );

        const [rows] = await pool.query<UserRow[]>(
            'SELECT id, name, email, created_at FROM users WHERE id = ?',
            [result.insertId]
        );

        return rows[0];
    },
};

