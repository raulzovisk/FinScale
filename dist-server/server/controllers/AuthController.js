"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
exports.AuthController = {
    async register(req, res) {
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
            const existingUser = await User_1.UserModel.findByEmail(email);
            if (existingUser) {
                res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
                return;
            }
            // Hash da senha com bcrypt
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = await User_1.UserModel.create({
                name,
                email,
                password: hashedPassword,
            });
            // Gerar token JWT após registro
            const token = jsonwebtoken_1.default.sign({ id: user.id }, auth_1.JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({
                user: { id: user.id, name: user.name, email: user.email },
                token,
            });
        }
        catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ message: 'Erro interno ao registrar usuário.' });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ message: 'Email e senha são obrigatórios.' });
                return;
            }
            const user = await User_1.UserModel.findByEmail(email);
            if (!user) {
                res.status(401).json({ message: 'E-mail ou senha incorretos.' });
                return;
            }
            // Comparar senha com hash usando bcrypt
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: 'E-mail ou senha incorretos.' });
                return;
            }
            // Gerar token JWT
            const token = jsonwebtoken_1.default.sign({ id: user.id }, auth_1.JWT_SECRET, { expiresIn: '7d' });
            res.json({
                user: { id: user.id, name: user.name, email: user.email },
                token,
            });
        }
        catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ message: 'Erro interno ao fazer login.' });
        }
    },
    async logout(req, res) {
        // JWT é stateless — logout é feito removendo o token no frontend
        res.json({ message: 'Logout realizado com sucesso.' });
    },
};
