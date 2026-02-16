"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionRoutes_1 = __importDefault(require("./transactionRoutes"));
const categoryRoutes_1 = __importDefault(require("./categoryRoutes"));
const authRoutes_1 = __importDefault(require("./authRoutes"));
const recurrentChargeRoutes_1 = __importDefault(require("./recurrentChargeRoutes"));
const telegramRoutes_1 = __importDefault(require("./telegramRoutes"));
const router = (0, express_1.Router)();
router.use('/auth', authRoutes_1.default);
router.use('/transactions', transactionRoutes_1.default);
router.use('/categories', categoryRoutes_1.default);
router.use('/recurrent-charges', recurrentChargeRoutes_1.default);
router.use('/telegram', telegramRoutes_1.default);
exports.default = router;
