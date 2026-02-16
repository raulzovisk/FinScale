"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const TransactionController_1 = require("../controllers/TransactionController");
const router = (0, express_1.Router)();
// Todas as rotas de transação requerem autenticação
router.use(auth_1.authMiddleware);
router.get('/summary', TransactionController_1.TransactionController.summary);
router.get('/', TransactionController_1.TransactionController.index);
router.post('/', TransactionController_1.TransactionController.store);
router.delete('/:id', TransactionController_1.TransactionController.destroy);
exports.default = router;
