import TelegramBot from 'node-telegram-bot-api';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { CardModel } from '../models/Card';
import { RecurrentChargeModel } from '../models/RecurrentCharge';

const CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Educação', 'Saúde', 'Trabalho', 'Outros'];
const FREQUENCIES: Record<string, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual',
};

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

async function saveRecurrentCharge(bot: TelegramBot, chatId: number, telegramId: number, stateData: Record<string, any>) {
    const user = await UserModel.findByTelegramId(telegramId);
    if (!user) {
        bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
        resetState(chatId);
        return;
    }

    const charge = await RecurrentChargeModel.create({
        users_id: user.id,
        description: stateData.description,
        amount: stateData.amount,
        type: stateData.type || 'expense',
        frequency: stateData.frequency,
        next_due_date: stateData.next_due_date,
        category: (stateData.category || 'recorrente').toLowerCase(),
        card_id: stateData.card_id || null,
    });

    const freq = FREQUENCIES[charge.frequency];
    const nextDate = new Date(charge.next_due_date).toLocaleDateString('pt-BR');
    const typeLabel = charge.type === 'income' ? '🟢 Entrada' : '🔴 Saída';

    resetState(chatId);
    bot.sendMessage(chatId,
        `✅ *Cobrança recorrente criada!*\n\n` +
        `${typeLabel}\n` +
        `📝 ${charge.description}\n` +
        `💲 R$ ${Number(charge.amount).toFixed(2)}\n` +
        `🔄 ${freq}\n` +
        `📅 Início: ${nextDate}\n` +
        `📂 ${stateData.category}\n\n` +
        `Use /menu para continuar.`,
        { parse_mode: 'Markdown' }
    );
}

function sendMenu(bot: TelegramBot, chatId: number, name: string) {
    bot.sendMessage(chatId,
        `📊 *Menu Principal*\n\nOlá, ${name}! O que deseja fazer?`,
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
                        { text: '🗑️ Apagar Transação', callback_data: 'tx_delete_list' },
                    ],
                    [
                        { text: '🔄 Recorrentes', callback_data: 'rec_menu' },
                        { text: '💳 Meus Cartões', callback_data: 'card_list' },
                    ],
                ],
            },
        }
    );
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
        sendMenu(bot, chatId, user.name);
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
            if (state.step !== 'tx_date' && state.step !== 'rec_next_date') return;

            const date = data.replace('cal_day_', '');

            if (state.step === 'rec_next_date') {
                // Recurrent charge flow — save date and ask category
                state.data.next_due_date = date;
                setState(chatId, 'rec_category', state.data);
                const dateFormatted = date.split('-').reverse().join('/');

                const keyboard = [];
                for (let i = 0; i < CATEGORIES.length; i += 2) {
                    const row: TelegramBot.InlineKeyboardButton[] = [
                        { text: CATEGORIES[i], callback_data: `rcat_${i}` },
                    ];
                    if (i + 1 < CATEGORIES.length) {
                        row.push({ text: CATEGORIES[i + 1], callback_data: `rcat_${i + 1}` });
                    }
                    keyboard.push(row);
                }

                bot.sendMessage(chatId,
                    `📅 Início: *${dateFormatted}*\n\n📂 Escolha a *categoria*:`,
                    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
                );
                return;
            }

            // Transaction flow
            state.data.date = date;

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

        // ===== CARD SELECTION IN TRANSACTION =====
        if (data.startsWith('txcard_')) {
            const state = getState(chatId);
            if (state.step !== 'tx_card') return;

            const cardId = data.replace('txcard_', '');
            state.data.card_id = cardId === 'none' ? null : parseInt(cardId);
            setState(chatId, 'tx_installments', state.data);

            // Ask installments
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

            const cardLabel = state.data.card_id ? `💳 Cartão selecionado` : '💳 Sem cartão';
            bot.sendMessage(chatId,
                `${cardLabel}\n\n📦 Quantas *parcelas*?`,
                { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
            );
            return;
        }

        // ===== LIST TRANSACTIONS =====
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
                const cardLabel = t.card_name ? ` | 💳 ${t.card_name}` : '';
                text += `${icon} *${t.description}*${installmentLabel}\n   R$ ${Number(t.amount).toFixed(2)} | ${t.category} | ${date}${cardLabel}\n\n`;
            }

            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            return;
        }

        // ===== DELETE TRANSACTION =====
        if (data === 'tx_delete_list') {
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Você precisa estar logado. Use /start.');
                return;
            }

            const transactions = await TransactionModel.findAllByUser(user.id);
            const last10 = transactions.slice(0, 10);

            if (last10.length === 0) {
                bot.sendMessage(chatId, '📭 Nenhuma transação para apagar.');
                return;
            }

            let text = '🗑️ *Selecione a transação para apagar:*\n\n';
            const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

            for (const t of last10) {
                const icon = t.type === 'income' ? '🟢' : '🔴';
                const date = new Date(t.date).toLocaleDateString('pt-BR');
                text += `${icon} ID: ${t.id} — *${t.description}* R$ ${Number(t.amount).toFixed(2)} (${date})\n`;
                keyboard.push([
                    { text: `🗑️ #${t.id} — ${t.description.substring(0, 25)}`, callback_data: `del_tx_${t.id}` },
                ]);
            }

            keyboard.push([{ text: '❌ Cancelar', callback_data: 'del_cancel' }]);

            bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
            return;
        }

        if (data.startsWith('del_tx_')) {
            const txId = parseInt(data.replace('del_tx_', ''));
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                return;
            }

            const deleted = await TransactionModel.deleteByIdAndUser(txId, user.id);
            if (deleted) {
                bot.sendMessage(chatId, `✅ Transação #${txId} apagada com sucesso!\n\nUse /menu para continuar.`);
            } else {
                bot.sendMessage(chatId, `❌ Transação #${txId} não encontrada ou já foi apagada.`);
            }
            resetState(chatId);
            return;
        }

        if (data === 'del_cancel') {
            bot.sendMessage(chatId, '❌ Operação cancelada.\n\nUse /menu para continuar.');
            resetState(chatId);
            return;
        }

        // ===== CARD LIST =====
        if (data === 'card_list') {
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Você precisa estar logado. Use /start.');
                return;
            }

            const cards = await CardModel.findAllByUser(user.id);

            if (cards.length === 0) {
                bot.sendMessage(chatId, '💳 Nenhum cartão cadastrado.\n\nAdicione cartões pelo site para usá-los aqui.');
                return;
            }

            let text = '💳 *Meus Cartões:*\n\n';
            for (const c of cards) {
                const digits = c.last_digits ? ` •••• ${c.last_digits}` : '';
                text += `*${c.name}*${digits}\n`;
                text += `   💰 Saldo: R$ ${Number(c.current_balance).toFixed(2)}\n`;
                text += `   🏦 Fundo: R$ ${Number(c.initial_balance).toFixed(2)}\n`;
                text += `   🟢 Entradas: R$ ${Number(c.total_income).toFixed(2)}\n`;
                text += `   🔴 Saídas: R$ ${Number(c.total_expense).toFixed(2)}\n\n`;
            }

            bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
            return;
        }

        // ===== RECURRENT CHARGES MENU =====
        if (data === 'rec_menu') {
            bot.sendMessage(chatId,
                '🔄 *Cobranças Recorrentes*\n\nO que deseja fazer?',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📋 Listar Recorrentes', callback_data: 'rec_list' }],
                            [{ text: '➕ Nova Recorrente', callback_data: 'rec_new' }],
                            [{ text: '◀ Voltar ao Menu', callback_data: 'back_menu' }],
                        ],
                    },
                }
            );
            return;
        }

        if (data === 'back_menu') {
            const user = await UserModel.findByTelegramId(telegramId);
            if (user) {
                resetState(chatId);
                sendMenu(bot, chatId, user.name);
            }
            return;
        }

        // List recurrent charges
        if (data === 'rec_list') {
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Você precisa estar logado. Use /start.');
                return;
            }

            const charges = await RecurrentChargeModel.findAllByUser(user.id);
            if (charges.length === 0) {
                bot.sendMessage(chatId, '📭 Nenhuma cobrança recorrente cadastrada.\n\nUse /menu → Recorrentes → Nova Recorrente para criar.');
                return;
            }

            let text = '🔄 *Cobranças Recorrentes:*\n\n';
            const keyboard: TelegramBot.InlineKeyboardButton[][] = [];

            for (const c of charges) {
                const status = c.is_active ? '✅' : '⏸️';
                const typeIcon = c.type === 'income' ? '🟢' : '🔴';
                const freq = FREQUENCIES[c.frequency] || c.frequency;
                const nextDate = new Date(c.next_due_date).toLocaleDateString('pt-BR');
                text += `${status} ${typeIcon} *${c.description}*\n   R$ ${Number(c.amount).toFixed(2)} | ${freq} | Próx: ${nextDate}\n\n`;
                keyboard.push([
                    { text: `${c.is_active ? '⏸️ Pausar' : '▶️ Ativar'} — ${c.description.substring(0, 15)}`, callback_data: `rec_toggle_${c.id}` },
                    { text: `🗑️`, callback_data: `rec_del_${c.id}` },
                ]);
            }

            keyboard.push([{ text: '◀ Voltar', callback_data: 'rec_menu' }]);

            bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
            return;
        }

        // Toggle recurrent charge
        if (data.startsWith('rec_toggle_')) {
            const recId = parseInt(data.replace('rec_toggle_', ''));
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                return;
            }

            const updated = await RecurrentChargeModel.toggleActive(recId, user.id);
            if (updated) {
                const status = updated.is_active ? '✅ Ativada' : '⏸️ Pausada';
                bot.sendMessage(chatId, `${status}: *${updated.description}*\n\nUse /menu para continuar.`, { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, '❌ Cobrança não encontrada.');
            }
            return;
        }

        // Delete recurrent charge
        if (data.startsWith('rec_del_')) {
            const recId = parseInt(data.replace('rec_del_', ''));
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                return;
            }

            const deleted = await RecurrentChargeModel.deleteByIdAndUser(recId, user.id);
            if (deleted) {
                bot.sendMessage(chatId, `✅ Cobrança recorrente apagada com sucesso!\n\nUse /menu para continuar.`);
            } else {
                bot.sendMessage(chatId, '❌ Cobrança não encontrada.');
            }
            return;
        }

        // New recurrent charge flow — start with type selection
        if (data === 'rec_new') {
            setState(chatId, 'rec_type', { telegramId });
            bot.sendMessage(chatId,
                '➕ *Nova Cobrança Recorrente*\n\nQual o *tipo*?',
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🔴 Saída', callback_data: 'rtype_expense' },
                                { text: '🟢 Entrada', callback_data: 'rtype_income' },
                            ],
                        ],
                    },
                }
            );
            return;
        }

        // Recurrent type selection
        if (data.startsWith('rtype_')) {
            const state = getState(chatId);
            if (state.step !== 'rec_type') return;

            const recType = data.replace('rtype_', '');
            state.data.type = recType;
            setState(chatId, 'rec_description', state.data);

            const typeLabel = recType === 'income' ? '🟢 Entrada' : '🔴 Saída';
            bot.sendMessage(chatId, `${typeLabel}\n\n📝 Digite a *descrição*:`, { parse_mode: 'Markdown' });
            return;
        }

        // Recurrent charge category selected → ask for card
        if (data.startsWith('rcat_')) {
            const state = getState(chatId);
            if (state.step !== 'rec_category') return;

            const catIndex = parseInt(data.replace('rcat_', ''));
            const category = CATEGORIES[catIndex];
            state.data.category = category;

            // Check if user has cards — if so, ask to select one
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                resetState(chatId);
                return;
            }

            const cards = await CardModel.findAllByUser(user.id);

            if (cards.length > 0) {
                setState(chatId, 'rec_card', state.data);
                const keyboard: TelegramBot.InlineKeyboardButton[][] = [
                    [{ text: '🚫 Sem cartão', callback_data: 'reccard_none' }],
                ];
                for (const card of cards) {
                    const digits = card.last_digits ? ` •••• ${card.last_digits}` : '';
                    keyboard.push([
                        { text: `💳 ${card.name}${digits}`, callback_data: `reccard_${card.id}` },
                    ]);
                }

                bot.sendMessage(chatId,
                    `📂 Categoria: *${category}*\n\n💳 Selecione o *cartão* (opcional):`,
                    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
                );
            } else {
                // No cards — save directly
                await saveRecurrentCharge(bot, chatId, telegramId, state.data);
            }
            return;
        }

        // Recurrent card selection → save
        if (data.startsWith('reccard_')) {
            const state = getState(chatId);
            if (state.step !== 'rec_card') return;

            const cardVal = data.replace('reccard_', '');
            state.data.card_id = cardVal === 'none' ? null : parseInt(cardVal);

            await saveRecurrentCharge(bot, chatId, telegramId, state.data);
            return;
        }

        // Recurrent charge frequency selection (unchanged)
        if (data.startsWith('freq_')) {
            const state = getState(chatId);
            if (state.step !== 'rec_frequency') return;

            const frequency = data.replace('freq_', '');
            state.data.frequency = frequency;
            setState(chatId, 'rec_next_date', state.data);

            const now = new Date();
            bot.sendMessage(chatId,
                `🔄 Frequência: *${FREQUENCIES[frequency]}*\n\n📅 Escolha a *data de início*:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: buildCalendar(now.getFullYear(), now.getMonth()),
                    },
                }
            );
            return;
        }

        // Installment selection (transaction save)
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

            const { type, category, amount, date, description, card_id } = state.data;
            const icon = type === 'income' ? '💰' : '💸';
            const typeLabel = type === 'income' ? 'Entrada' : 'Saída';
            const dateFormatted = date.split('-').reverse().join('/');

            // Get card name for display
            let cardLabel = '';
            if (card_id) {
                const card = await CardModel.findById(card_id, user.id);
                if (card) cardLabel = `\n💳 ${card.name}`;
            }

            if (installments > 1) {
                await TransactionModel.createInstallments({
                    users_id: user.id,
                    description,
                    totalAmount: amount,
                    type,
                    category,
                    date,
                    installments,
                    card_id: card_id || undefined,
                });

                const parcelValue = (amount / installments).toFixed(2);
                resetState(chatId);
                bot.sendMessage(chatId,
                    `✅ *Parcelamento registrado!*\n\n` +
                    `${icon} *${typeLabel}*\n` +
                    `📝 ${description}\n` +
                    `💲 ${installments}x de R$ ${parcelValue} (Total: R$ ${amount.toFixed(2)})\n` +
                    `📂 ${category}\n` +
                    `📅 Início: ${dateFormatted}${cardLabel}\n\n` +
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
                    card_id: card_id || undefined,
                });

                resetState(chatId);
                bot.sendMessage(chatId,
                    `✅ *Transação registrada com sucesso!*\n\n` +
                    `${icon} *${typeLabel}*\n` +
                    `📝 ${description}\n` +
                    `💲 R$ ${amount.toFixed(2)}\n` +
                    `📂 ${category}\n` +
                    `📅 ${dateFormatted}${cardLabel}\n\n` +
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

            // Check if user has cards — if so, ask to select one
            const user = await UserModel.findByTelegramId(telegramId);
            if (!user) {
                bot.sendMessage(chatId, '⚠️ Sessão expirada. Use /start.');
                resetState(chatId);
                return;
            }

            const cards = await CardModel.findAllByUser(user.id);

            if (cards.length > 0) {
                // Ask for card selection
                setState(chatId, 'tx_card', state.data);

                const keyboard: TelegramBot.InlineKeyboardButton[][] = [
                    [{ text: '🚫 Sem cartão', callback_data: 'txcard_none' }],
                ];
                for (const card of cards) {
                    const digits = card.last_digits ? ` •••• ${card.last_digits}` : '';
                    keyboard.push([
                        { text: `💳 ${card.name}${digits}`, callback_data: `txcard_${card.id}` },
                    ]);
                }

                bot.sendMessage(chatId,
                    `📝 Descrição: *${text}*\n\n💳 Selecione o *cartão* (opcional):`,
                    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
                );
            } else {
                // No cards — go straight to installments
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
            }
            return;
        }

        // ===== RECURRENT CHARGE: DESCRIPTION =====
        if (state.step === 'rec_description') {
            state.data.description = text;
            setState(chatId, 'rec_amount', state.data);
            bot.sendMessage(chatId, `📝 Descrição: *${text}*\n\n💲 Digite o *valor* (ex: 99.90):`, { parse_mode: 'Markdown' });
            return;
        }

        // ===== RECURRENT CHARGE: AMOUNT =====
        if (state.step === 'rec_amount') {
            const amount = parseFloat(text.replace(',', '.'));
            if (isNaN(amount) || amount <= 0) {
                bot.sendMessage(chatId, '❌ Valor inválido. Digite um número positivo (ex: 99.90):');
                return;
            }
            state.data.amount = amount;
            setState(chatId, 'rec_frequency', state.data);

            bot.sendMessage(chatId,
                `💲 Valor: *R$ ${amount.toFixed(2)}*\n\n🔄 Escolha a *frequência*:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📅 Diário', callback_data: 'freq_daily' },
                                { text: '📅 Semanal', callback_data: 'freq_weekly' },
                            ],
                            [
                                { text: '📅 Mensal', callback_data: 'freq_monthly' },
                                { text: '📅 Anual', callback_data: 'freq_yearly' },
                            ],
                        ],
                    },
                }
            );
            return;
        }
    });

    console.log('🤖 Bot do Telegram inicializado.');
    return bot;
}
