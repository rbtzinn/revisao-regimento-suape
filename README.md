# Portal de Revisão do Regimento Interno

Aplicação privada para revisar as competências do Regimento Interno de 2024 em comparação com o organograma atual. A planilha Google “Diretorias x Regimento” continua sendo a fonte única dos dados.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e configure:

- `GOOGLE_SHEETS_WEBAPP_URL`: URL publicada do Apps Script vinculada à planilha.
- `GOOGLE_SHEETS_WEBAPP_TOKEN`: token compartilhado entre o portal e o Apps Script.
- `PORTAL_ACCESS_PASSWORD`: senha que a equipe usará para entrar no portal.
- `PORTAL_SESSION_SECRET`: segredo aleatório usado para assinar sessões; use pelo menos 32 bytes.

Todas as quatro variáveis são privadas e devem ser cadastradas nos ambientes Production, Preview e Development da Vercel.

## Desenvolvimento

```bash
npm install
npm run dev
npm run lint
npm test
```

## Publicação na Vercel

1. Importe este repositório na Vercel como um projeto Next.js.
2. Cadastre as quatro variáveis de ambiente antes do primeiro deploy.
3. Mantenha o repositório privado.
4. Configure um domínio próprio na área Domains, se desejar.

O navegador nunca recebe o token do Apps Script. O portal lê as oito abas por uma rota do servidor, envia as edições ao Apps Script e mantém a competência atualizada na coluna E da respectiva aba. A exportação em PDF respeita a diretoria, o status e a busca selecionados na tela.
