import { Router, Request, Response } from 'express';
import TelegramBot from 'node-telegram-bot-api';

// O bot será injetado pelo server/index.ts
let botInstance: TelegramBot | null = null;

export function setBotInstance(bot: TelegramBot) {
    botInstance = bot;
}

const router = Router();

// Webhook do Telegram (sem autenticação — é chamado pelo Telegram)
router.post('/webhook', (req: Request, res: Response) => {
    if (botInstance) {
        botInstance.processUpdate(req.body);
    }
    res.sendStatus(200);
});

export default router;
