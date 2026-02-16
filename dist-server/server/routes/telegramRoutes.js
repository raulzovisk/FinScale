"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBotInstance = setBotInstance;
const express_1 = require("express");
// O bot será injetado pelo server/index.ts
let botInstance = null;
function setBotInstance(bot) {
    botInstance = bot;
}
const router = (0, express_1.Router)();
// Webhook do Telegram (sem autenticação — é chamado pelo Telegram)
router.post('/webhook', (req, res) => {
    if (botInstance) {
        botInstance.processUpdate(req.body);
    }
    res.sendStatus(200);
});
exports.default = router;
