# FinScale - Controle de Gastos

Aplicação de controle financeiro pessoal com dashboard, gráficos analíticos e integração com Telegram.
Projeto de estudo realizado com o auxílio do Antigravity.

## 🛠 Tecnologias

| Camada   | Tecnologia                      |
|----------|---------------------------------|
| Frontend | React 19, Vite, Tailwind CSS, Recharts, Lucide Icons |
| Backend  | Node.js, Express, TypeScript    |
| Banco    | MySQL (mysql2)                  |

## 📁 Estrutura de Pastas

```
financas/
├── server/                # Backend Express (MVC)
│   ├── config/            # Conexão com banco de dados
│   ├── controllers/       # Lógica dos endpoints
│   ├── models/            # Acesso ao banco de dados
│   ├── routes/            # Definição das rotas
│   ├── migrations/        # Scripts SQL
│   └── index.ts           # Entry point do servidor
├── src/                   # Frontend React
│   ├── components/        # Componentes React
│   ├── services/          # API client e Gemini AI
│   ├── types/             # Interfaces TypeScript
│   ├── App.tsx            # Componente principal
│   └── index.tsx          # Entry point React
├── index.html             # HTML base
├── package.json           # Dependências e scripts
├── vite.config.ts         # Config do Vite
└── .env                   # Variáveis de ambiente
```

## 🚀 Como Executar

### Pré-requisitos

- **Node.js** 18+
- **MySQL** 8+ instalado e rodando

### Passo a Passo

```bash
# 1. Criar o banco de dados no MySQL
mysql -u root -p -e "CREATE DATABASE finscale_db;"

# 2. Executar a migration para criar as tabelas
mysql -u root -p finscale_db < server/migrations/init.sql

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais MySQL e chave Gemini

# 4. Instalar dependências
npm install

# 5. Iniciar o app (frontend + backend juntos)
npm run dev
```

### Scripts Disponíveis

| Comando          | Descrição                                 |
|------------------|-------------------------------------------|
| `npm run dev`    | Inicia frontend (3000) + backend (3001)   |
| `npm run dev:client` | Inicia apenas o frontend             |
| `npm run dev:server` | Inicia apenas o backend              |
| `npm run build`  | Build de produção do frontend             |

### Endpoints da API


