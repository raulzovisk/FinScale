"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const ngrok_1 = __importDefault(require("@ngrok/ngrok"));
const routes_1 = __importDefault(require("./routes"));
const RecurrenceService_1 = require("./services/RecurrenceService");
const TelegramBot_1 = require("./services/TelegramBot");
const telegramRoutes_1 = require("./routes/telegramRoutes");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.SERVER_PORT || 3001;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api', routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path_1.default.join(__dirname, '../../dist');
    app.use(express_1.default.static(distPath));
    app.get('{*path}', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path_1.default.join(distPath, 'index.html'));
        }
    });
}
// Inicializar bot do Telegram
async function startTelegramBot() {
    const token = process.env.TELEGRAM_BOT_API;
    if (!token) {
        console.log('⚠️  TELEGRAM_BOT_API não configurado, bot desabilitado.');
        return;
    }
    try {
        let webhookHost;
        if (process.env.RENDER_EXTERNAL_URL) {
            // Em produção no Render
            webhookHost = process.env.RENDER_EXTERNAL_URL;
        }
        else {
            // Em desenvolvimento com Ngrok
            const listener = await ngrok_1.default.forward({
                addr: Number(PORT),
                authtoken_from_env: true,
            });
            webhookHost = listener.url();
            console.log(`🌐 Ngrok tunnel aberto: ${webhookHost}`);
        }
        // Inicializar bot
        const bot = (0, TelegramBot_1.initTelegramBot)(token);
        (0, telegramRoutes_1.setBotInstance)(bot);
        // Configurar webhook do Telegram
        const webhookUrl = `${webhookHost}/api/telegram/webhook`;
        await bot.setWebHook(webhookUrl);
        console.log(`🤖 Webhook do Telegram configurado: ${webhookUrl}`);
    }
    catch (error) {
        console.error('❌ Erro ao inicializar bot do Telegram:', error);
        if (!process.env.RENDER_EXTERNAL_URL) {
            console.log('💡 Dica: Certifique-se de ter NGROK_AUTHTOKEN no .env para desenvolvimento local');
        }
    }
}
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor FinScale rodando na porta ${PORT}`);
    console.log(`📡 API disponível em http://localhost:${PORT}/api`);
    // Processar cobranças vencidas ao iniciar
    RecurrenceService_1.RecurrenceService.processAllDueCharges().catch(err => console.error('Erro no processamento inicial de recorrências:', err));
    // Agendar processamento a cada 1 hora
    setInterval(() => {
        RecurrenceService_1.RecurrenceService.processAllDueCharges().catch(err => console.error('Erro no processamento periódico de recorrências:', err));
    }, 60 * 60 * 1000);
    // Inicializar Telegram bot
    startTelegramBot();
});
