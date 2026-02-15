import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicializar bot do Telegram com ngrok
async function startTelegramBot() {
    const token = process.env.TELEGRAM_BOT_API;
    if (!token) {
        console.log('⚠️  TELEGRAM_BOT_API não configurado, bot desabilitado.');
        return;
    }

    try {
        // Criar tunnel ngrok
        const listener = await ngrok.forward({
            addr: Number(PORT),
            authtoken_from_env: true,
        });

        const ngrokUrl = listener.url()!;
        console.log(`🌐 Ngrok tunnel aberto: ${ngrokUrl}`);

        // Inicializar bot
        const bot = initTelegramBot(token);
        setBotInstance(bot);

        // Configurar webhook do Telegram
        const webhookUrl = `${ngrokUrl}/api/telegram/webhook`;
        await bot.setWebHook(webhookUrl);
        console.log(`🤖 Webhook do Telegram configurado: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Erro ao inicializar bot do Telegram:', error);
        console.log('💡 Dica: Certifique-se de ter NGROK_AUTHTOKEN no .env');
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

