# KModa Admin

Sistema administrativo web para a operação da loja KModa, com foco em produtividade, controle operacional e visão gerencial.

O projeto foi estruturado como uma apresentação de portfólio sólida: interface responsiva, organização por perfis, suporte a PWA e integração com backend gerenciado.

## Visão Geral

O app centraliza os principais fluxos da loja em uma única interface:

- acesso com autenticação por PIN
- perfis separados entre administração e operação de caixa
- dashboard com indicadores e movimentações recentes
- cadastro e gestão de produtos, modelos e variações
- controle de clientes
- movimentações de estoque
- abertura, fechamento e registro de vendas e despesas no caixa
- busca por código de barras
- exportação de dados e backup local
- monitoramento de uso e alertas internos
- instalação como aplicativo via PWA

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Supabase
- React Router DOM
- Lucide React

## Destaques

- interface responsiva para desktop e mobile
- proteção de rotas por perfil
- fluxo de caixa voltado para operação de loja
- suporte a leitura por código de barras
- exportação de dados para uso local
- persistência de sessão e controles de acesso
- experiência pronta para instalação como app

## Requisitos

- Node.js 20+ recomendado
- npm
- credenciais do ambiente configurado

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais do ambiente:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

Variáveis opcionais:

```bash
VITE_APP_URL=https://seu-dominio.com
VITE_SESSION_INACTIVITY_TIMEOUT_MS=900000
```

## Como Rodar Localmente

```bash
npm install
npm run dev
```

O Vite sobe o projeto em `http://127.0.0.1:5173/` ou na próxima porta disponível.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Deploy

O projeto já inclui configuração de rewrite para SPA via `vercel.json`, então pode ser publicado diretamente na Vercel sem ajustes extras de rota.

## Observações

- Parte das telas é restrita ao perfil `admin`.
- O sistema foi desenhado para uso em operação real de loja, com atenção a acesso, controle e agilidade.
