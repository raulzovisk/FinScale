import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

const apiKey = process.env.API_KEY || '';

export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
    if (!apiKey) return "Configure a chave da API Gemini para receber conselhos financeiros.";
    if (transactions.length === 0) return "Adicione algumas transações para receber conselhos financeiros personalizados.";

    const summary = transactions.map(t => `${t.date}: ${t.description} - R$${t.amount} (${t.type})`).join('\n');

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analise as seguintes transações financeiras e forneça 3 dicas práticas para economizar ou gerenciar melhor o dinheiro. Seja direto, amigável e use português do Brasil.\n\nTransações:\n${summary}`,
            config: {
                systemInstruction: "Você é um consultor financeiro especialista em economia doméstica e investimentos.",
                temperature: 0.7,
            },
        });

        return response.text || "Não foi possível gerar uma análise no momento.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "Erro ao conectar com o consultor financeiro AI.";
    }
};

