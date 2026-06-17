# KModa Admin

Base administrativa para controle de produtos, categorias, clientes, estoque, vendas e fluxo de caixa da loja KModa.

## Stack

- React
- TypeScript / TSX
- Vite
- TailwindCSS
- Supabase
- React Router DOM
- Lucide React

## Como rodar

```bash
npm install
npm run dev
```

O Vite abrirá o app em `http://127.0.0.1:5173/` ou na próxima porta disponível.

## Supabase

Crie um arquivo `.env` na raiz usando `.env.example` como base:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
# Opcional: tempo de inatividade do logout em milissegundos
VITE_SESSION_INACTIVITY_TIMEOUT_MS=900000
```

Depois, execute `supabase/schema.sql` no SQL Editor do Supabase para criar as tabelas iniciais.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
