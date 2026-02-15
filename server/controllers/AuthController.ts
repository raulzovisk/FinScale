import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { JWT_SECRET } from '../middleware/auth';

export const AuthController = {

    async register(req: Request, res: Response): Promise<void> {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
                return;
            }

            if (password.length < 6) {
                res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
                return;
            }

            // Verificar se email já existe
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
                return;
            }

            // Hash da senha com bcrypt
            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await UserModel.create({
                name,
                email,
                password: hashedPassword,
            });

            // Gerar token JWT após registro
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

            res.status(201).json({
                user: { id: user.id, name: user.name, email: user.email },
                token,
            });
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ message: 'Erro interno ao registrar usuário.' });
        }
    },

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({ message: 'Email e senha são obrigatórios.' });
                return;
            }

            const user = await UserModel.findByEmail(email);
            if (!user) {
                res.status(401).json({ message: 'E-mail ou senha incorretos.' });
                return;
            }

            // Comparar senha com hash usando bcrypt
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'E-mail ou senha incorretos.' });
                return;
            }

            // Gerar token JWT
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

            res.json({
                user: { id: user.id, name: user.name, email: user.email },
                token,
            });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ message: 'Erro interno ao fazer login.' });
        }
    },

    async logout(req: Request, res: Response): Promise<void> {
        // JWT é stateless — logout é feito removendo o token no frontend
        res.json({ message: 'Logout realizado com sucesso.' });
    },
};