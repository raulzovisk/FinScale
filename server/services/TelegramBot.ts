import TelegramBot from 'node-telegram-bot-api';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';

const CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Educação', 'Saúde', 'Trabalho', 'Outros'];

// State machine para cada chat
interface ChatState {
    step: string;
    data: Record<string, any>;
}

const chatStates = new Map<number, ChatState>();

function getState(chatId: number): ChatState {
    if (!chatStates.has(chatId)) {
        chatStates.set(chatId, { step: 'idle', data: {} });
    }
    return chatStates.get(chatId)!;
}

function setState(chatId: number, step: string, data?: Record<string, any>) {
    const current = getState(chatId);
    chatStates.set(chatId, { step, data: data ?? current.data });
}

function resetState(chatId: number) {
    chatStates.set(chatId, { step: 'idle', data: {} });
}

// Gerar calendário inline
function buildCalendar(year: number, month: number): TelegramBot.InlineKeyboardButton[][] {
    const rows: TelegramBot.InlineKeyboardButton[][] = [];
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Header: ◀ Mês/Ano ▶
    rows.push([
        { text: '◀', callback_data: `cal_prev_${year}_${month}` },
        { text: `${monthNames[month]} ${year}`, callback_data: 'cal_ignore' },
        { text: '▶', callback_data: `cal_next_${year}_${month}` },
    ]);

    // Dias da semana
    rows.push(['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => ({ text: d, callback_data: 'cal_ignore' })));

    // Dias do mês
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let week: TelegramBot.InlineKeyboardButton[] = [];
    for (let i = 0; i < firstDay; i++) {
        week.push({ text: ' ', callback_data: 'cal_ignore' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        week.push({ text: String(day), callback_data: `cal_day_${dateStr}` });
        if (week.length === 7) {
            rows.push(week);
            week = [];
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push({ text: ' ', callback_data: 'cal_ignore' });
        rows.push(week);
    }

    // Botão "Hoje"
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    rows.push([{ text: '📅 Hoje', callback_data: `cal_day_${todayStr}` }]);

    return rows;
}

export function initTelegramBot(token: string): TelegramBot {
    const bot = new TelegramBot(token);

    // /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const telegramId = msg.from!.id;

        // Verificar se já está vinculado
        const existingUser = await UserModel.findByTelegramId(telegramId);
        if (existingUser) {
            resetState(chatId);
            bot.sendMessage(chatId,
                `👋 Bem-vindo de volta, *${existingUser.name}*!\n\nUse /menu para gerenciar suas transações.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        setState(chatId, 'auth_choice', { telegramId });
        bot.sendMessage(chatId,
            '🏦 *FinScale — Controle Financeiro*\n\nVocê já tem uma conta?',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔑 Já tenho conta', callback_data: 'auth_login' },
                            { text: '📝 Criar conta', callback_data: 'auth_register' },
                        ],
                    ],
                },
            }
        );
    });

    // /menu
    bot.onText(/\/menu/, async (msg) => {
        const chatId = msg.chat.id;
        const telegramId = msg.from!.id;

        const user = await UserModel.findByTelegramId(telegramId);
        if (!user) {
            bot.sendMessage(chatId, '⚠️ Você precisa estar logado. Use /start para entrar.');
            return;
        }

        resetState(chatId);
        bot.sendMessage(chatId,
            `📊 *Menu Principal*\n\nOlá, ${user.name}! O que deseja fazer?`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💰 Nova Entrada', callback_data: 'tx_income' },
                            { text: '💸 Nova Saída', callback_data: 'tx_expense' },
                        ],
                        [
                            { text: '📋 Últimas Transações', callback_data: 'tx_list' },
                        ],
                    ],
                },
            }
        );
    });

    // Callback queries
    bot.on('callback_query', async (query) => {
        const chatId = query.message!.chat.id;
        const data = query.data!;
        const telegramId = query.from.id;

        await bot.answerCallbackQuery(query.id);

        // ===== AUTH FLOW =====
        if (data === 'auth_login') {
            setState(chatId, 'login_email', { telegramId });
            bot.sendMessage(chatId, '📧 Digite seu *e-mail*:', { parse_mode: 'Markdown' });
            return;
        }

        if (data === 'auth_register') {
            setState(chatId, 'register_name', { telegramId });
            bot.sendMessage(chatId, '👤 Digite seu *nome*:', { parse_mode: 'Markdown' });
            return;
        }

        // ===== TRANSACTION FLOW =====
        if (data === 'tx_income' || data === 'tx_expense') {
            const type = data === 'tx_income' ? 'income' : 'expense';
            setState(chatId, 'tx_category', { telegramId, type });

            const keyboard = [];
            for (let i = 0; i < CATEGORIES.length; i += 2) {
                const row: TelegramBot.InlineKeyboardButton[] = [
                    { text: CATEGORIES[i], callback_data: `cat_${i}` },
                ];
                if (i + 1 < CATEGORIES.length) {
                    row.push({ text: CATEGORIES[i + 1], callback_data: `cat_${i + 1}` });
                }
                keyboard.push(row);
            }

            const label = type === 'income' ? '💰 Entrada' : '💸 Saída';
            bot.sendMessage(chatId,
                `${label}\n\n📂 Escolha a *categoria*:`,
                { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
            );
            return;
        }

        // Category selected
        if (data.startsWith('cat_')) {
            const state = getState(chatId);
            if (state.step !== 'tx_category') return;

            const catIndex = parseInt(data.replace('cat_', ''));
            const category = CATEGORIES[catIndex];
            state.data.category = category;
            setState(chatId, 'tx_amount', state.data);

            bot.sendMessage(chatId, `Categoria: *${category}*\n\n💲 Digite o *valor* (ex: 150.50):`, { parse_mode: 'Markdown' });
            return;
        }

        // Calendar navigation
        if (data.startsWith('cal_prev_') || data.startsWith('cal_next_')) {
            const parts = data.split('_');
            let year = parseInt(parts[2]);
            let month = parseInt(parts[3]);

            if (data.startsWith('cal_prev_')) {
                month--;
                if (month < 0) { month = 11; year--; }
            } else {
                month++;
                if (month > 11) { month = 0; year++; }
            }

            await bot.editMessageReplyMarkup(
                { inline_keyboard: buildCalendar(year, month) },
                { chat_id: chatId, message_id: query.message!.message_id }
            );
            return;
        }

        // Calendar day selected
        if (data.startsWith('cal_day_')) {
            const state = getState(chatId);
            if (state.step !== 'tx_date') return;

            const date = data.replace('cal_day_', '');
            state.data.date = date;

            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                resetState(chatId);
                return;
            }

            // Pedir descrição
            setState(chatId, 'tx_description', state.data);
            const dateFormatted = date.split('-').reverse().join('/');
            bot.sendMessage(chatId,
                `📅 Data: *${dateFormatted}*\n\n📝 Digite uma *descrição* para a transação:`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        if (data === 'cal_ignore') return;

        // List last transactions
        if (data === 'tx_list') {
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Você precisa estar logado. Use /start.');
                return;
            }

            const transactions = await TransactionModel.findAllByUser(user.id);
            const last5 = transactions.slice(0, 5);

            if (last5.length === 0) {
                bot.sendMessage(chatId, '📭 Nenhuma transação registrada.');
                return;
            }

            let text = '📋 *Últimas Transações:*\n\n';
            for (const t of last5) {
                const icon = t.type === 'income' ? '🟢' : '🔴';
                const date = new Date(t.date).toLocaleDateString('pt-BR');
                const installmentLabel = t.installment_total && t.installment_total > 1 ? ` (${t.installment_number}/${t.installment_total})` : '';
                text += `${icon} *${t.description}*${installmentLabel}\n   R$ ${Number(t.amount).toFixed(2)} | ${t.category} | ${date}\n\n`;
            }

            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            return;
        }

        // Installment selection
        if (data.startsWith('inst_')) {
            const state = getState(chatId);
            if (state.step !== 'tx_installments') return;

            const installments = parseInt(data.replace('inst_', ''));
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                resetState(chatId);
                return;
            }

            const { type, category, amount, date, description } = state.data;
            const icon = type === 'income' ? '💰' : '💸';
            const typeLabel = type === 'income' ? 'Entrada' : 'Saída';
            const dateFormatted = date.split('-').reverse().join('/');

            if (installments > 1) {
                await TransactionModel.createInstallments({
                    users_id: user.id,
                    description,
                    totalAmount: amount,
                    type,
                    category,
                    date,
                    installments,
                });

                const parcelValue = (amount / installments).toFixed(2);
                resetState(chatId);
                bot.sendMessage(chatId,
                    `✅ *Parcelamento registrado!*\n\n` +
                    `${icon} *${typeLabel}*\n` +
                    `📝 ${description}\n` +
                    `💲 ${installments}x de R$ ${parcelValue} (Total: R$ ${amount.toFixed(2)})\n` +
                    `📂 ${category}\n` +
                    `📅 Início: ${dateFormatted}\n\n` +
                    `Use /menu para continuar.`,
                    { parse_mode: 'Markdown' }
                );
            } else {
                await TransactionModel.create({
                    users_id: user.id,
                    description,
                    amount,
                    type,
                    category,
                    date,
                });

                resetState(chatId);
                bot.sendMessage(chatId,
                    `✅ *Transação registrada com sucesso!*\n\n` +
                    `${icon} *${typeLabel}*\n` +
                    `📝 ${description}\n` +
                    `💲 R$ ${amount.toFixed(2)}\n` +
                    `📂 ${category}\n` +
                    `📅 ${dateFormatted}\n\n` +
                    `Use /menu para continuar.`,
                    { parse_mode: 'Markdown' }
                );
            }
            return;
        }
    });

    // Text messages — state machine handler
    bot.on('message', async (msg) => {
        if (!msg.text || msg.text.startsWith('/')) return;

        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const state = getState(chatId);
        const telegramId = msg.from!.id;

        // ===== LOGIN FLOW =====
        if (state.step === 'login_email') {
            state.data.email = text;
            setState(chatId, 'login_password', state.data);
            bot.sendMessage(chatId, '🔒 Digite sua *senha*:', { parse_mode: 'Markdown' });
            return;
        }

        if (state.step === 'login_password') {
            const user = await UserModel.findByEmail(state.data.email);
            if (!user) {
                bot.sendMessage(chatId, '❌ E-mail não encontrado. Tente novamente com /start.');
                resetState(chatId);
                return;
            }

            const valid = await bcrypt.compare(text, user.password);
            if (!valid) {
                bot.sendMessage(chatId, '❌ Senha incorreta. Tente novamente com /start.');
                resetState(chatId);
                return;
            }

            // Verificar se telegram_id já está vinculado a outro usuário
            const alreadyLinked = await UserModel.findByTelegramId(telegramId);
            if (alreadyLinked && alreadyLinked.id !== user.id) {
                bot.sendMessage(chatId, '⚠️ Este Telegram já está vinculado a outra conta.');
                resetState(chatId);
                return;
            }

            await UserModel.linkTelegram(user.id, telegramId);
            resetState(chatId);
            bot.sendMessage(chatId,
                `✅ Login realizado com sucesso!\n\n👋 Bem-vindo, *${user.name}*!\n\nUse /menu para gerenciar suas transações.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // ===== REGISTER FLOW =====
        if (state.step === 'register_name') {
            state.data.name = text;
            setState(chatId, 'register_email', state.data);
            bot.sendMessage(chatId, '📧 Digite seu *e-mail*:', { parse_mode: 'Markdown' });
            return;
        }

        if (state.step === 'register_email') {
            // Validar formato básico de email
            if (!text.includes('@') || !text.includes('.')) {
                bot.sendMessage(chatId, '❌ E-mail inválido. Tente novamente:');
                return;
            }
            const existing = await UserModel.findByEmail(text);
            if (existing) {
                bot.sendMessage(chatId, '❌ Este e-mail já está cadastrado. Use /start para fazer login.');
                resetState(chatId);
                return;
            }
            state.data.email = text;
            setState(chatId, 'register_password', state.data);
            bot.sendMessage(chatId, '🔒 Crie uma *senha* (mínimo 6 caracteres):', { parse_mode: 'Markdown' });
            return;
        }

        if (state.step === 'register_password') {
            if (text.length < 6) {
                bot.sendMessage(chatId, '❌ A senha deve ter pelo menos 6 caracteres. Tente novamente:');
                return;
            }

            const hashedPassword = await bcrypt.hash(text, 10);
            const user = await UserModel.create({
                name: state.data.name,
                email: state.data.email,
                password: hashedPassword,
            });

            await UserModel.linkTelegram(user.id, telegramId);
            resetState(chatId);
            bot.sendMessage(chatId,
                `✅ Conta criada com sucesso!\n\n👋 Bem-vindo, *${user.name}*!\n\nUse /menu para gerenciar suas transações.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // ===== TRANSACTION: AMOUNT =====
        if (state.step === 'tx_amount') {
            const amount = parseFloat(text.replace(',', '.'));
            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, '❌ Valor inválido. Digite um número positivo (ex: 50.00):');
                return;
            }
            state.data.amount = amount;
            setState(chatId, 'tx_date', state.data);

            const now = new Date();
            bot.sendMessage(chatId, '📅 Escolha a *data* da transação:', {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: buildCalendar(now.getFullYear(), now.getMonth()),
                },
            });
            return;
        }

        // ===== TRANSACTION: DESCRIPTION =====
        if (state.step === 'tx_description') {
            state.data.description = text;
            setState(chatId, 'tx_installments', state.data);

            const keyboard: TelegramBot.InlineKeyboardButton[][] = [
                [{ text: '💵 À Vista', callback_data: 'inst_1' }],
                [
                    { text: '2x', callback_data: 'inst_2' },
                    { text: '3x', callback_data: 'inst_3' },
                    { text: '4x', callback_data: 'inst_4' },
                ],
                [
                    { text: '5x', callback_data: 'inst_5' },
                    { text: '6x', callback_data: 'inst_6' },
                    { text: '7x', callback_data: 'inst_7' },
                ],
                [
                    { text: '8x', callback_data: 'inst_8' },
                    { text: '10x', callback_data: 'inst_10' },
                    { text: '12x', callback_data: 'inst_12' },
                ],
            ];

            bot.sendMessage(chatId,
                `📝 Descrição: *${text}*\n\n📦 Quantas *parcelas*?`,
                { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
            );
            return;
        }
    });

    console.log('🤖 Bot do Telegram inicializado.');
    return bot;
}
