import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { TransactionModel } from '../models/Transaction';
import { RecurrentChargeModel } from '../models/RecurrentCharge';

function calculateNextDueDate(currentDate: string, frequency: string): string {
    const date = new Date(currentDate + 'T12:00:00');

    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
}

export const RecurrenceService = {
    /**
     * Processa cobranças vencidas de um usuário específico.
     * Cria transações para cada vencimento pendente e avança a next_due_date.
     */
    async processDueChargesForUser(userId: number): Promise<number> {
        let totalCreated = 0;

        // Buscar cobranças ativas e vencidas do usuário
        const [charges] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM recurrent_charges WHERE users_id = ? AND is_active = 1 AND next_due_date <= CURDATE()',
            [userId]
        );

        for (const charge of charges) {
            let nextDate = formatDate(charge.next_due_date);
            const today = new Date().toISOString().split('T')[0];

            // Gerar transações para cada período vencido
            while (nextDate <= today) {
                await TransactionModel.create({
                    users_id: charge.users_id,
                    description: `🔄 ${charge.description}`,
                    amount: charge.amount,
                    type: 'expense',
                    category: charge.category || 'recorrente',
                    date: nextDate,
                });

                totalCreated++;
                nextDate = calculateNextDueDate(nextDate, charge.frequency);
            }

            // Atualizar next_due_date para a próxima data futura
            await pool.query<ResultSetHeader>(
                'UPDATE recurrent_charges SET next_due_date = ? WHERE id = ?',
                [nextDate, charge.id]
            );
        }

        return totalCreated;
    },

    /**
     * Processa cobranças vencidas de TODOS os usuários.
     * Usado no startup do servidor e no agendamento periódico.
     */
    async processAllDueCharges(): Promise<number> {
        let totalCreated = 0;

        const [users] = await pool.query<RowDataPacket[]>(
            'SELECT DISTINCT users_id FROM recurrent_charges WHERE is_active = 1 AND next_due_date <= CURDATE()'
        );

        for (const row of users) {
            const created = await this.processDueChargesForUser(row.users_id);
            totalCreated += created;
        }

        if (totalCreated > 0) {
            console.log(`🔄 Processamento de recorrências: ${totalCreated} transação(ões) gerada(s).`);
        }

        return totalCreated;
    },
};
