import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import ngrok from '@ngrok/ngrok';
import routes from './routes';
import { RecurrenceService } from './services/RecurrenceService';
import { initTelegramBot } from './services/TelegramBot';
import { setBotInstance } from './routes/telegramRoutes';

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../dist')));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../../dist/index.html'));
        }
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicializar bot do Telegram
async function startTelegramBot() {
    const token = process.env.TELEGRAM_BOT_API;
    if (!token) {
        console.log('⚠️  TELEGRAM_BOT_API não configurado, bot desabilitado.');
        return;
    }

    try {
        let webhookHost: string;

        if (process.env.RENDER_EXTERNAL_URL) {
            // Em produção no Render
            webhookHost = process.env.RENDER_EXTERNAL_URL;
        } else {
            // Em desenvolvimento com Ngrok
            const listener = await ngrok.forward({
                addr: Number(PORT),
                authtoken_from_env: true,
            });
            webhookHost = listener.url()!;
            console.log(`🌐 Ngrok tunnel aberto: ${webhookHost}`);
        }

        // Inicializar bot
        const bot = initTelegramBot(token);
        setBotInstance(bot);

        // Configurar webhook do Telegram
        const webhookUrl = `${webhookHost}/api/telegram/webhook`;
        await bot.setWebHook(webhookUrl);
        console.log(`🤖 Webhook do Telegram configurado: ${webhookUrl}`);
    } catch (error) {
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
    RecurrenceService.processAllDueCharges().catch(err =>
        console.error('Erro no processamento inicial de recorrências:', err)
    );

    // Agendar processamento a cada 1 hora
    setInterval(() => {
        RecurrenceService.processAllDueCharges().catch(err =>
            console.error('Erro no processamento periódico de recorrências:', err)
        );
    }, 60 * 60 * 1000);

    // Inicializar Telegram bot
    startTelegramBot();
});

