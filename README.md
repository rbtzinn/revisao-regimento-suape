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

O navegador nunca recebe o token do Apps Script. O portal lê as nove abas por uma rota do servidor, envia as edições ao Apps Script e mantém a competência atualizada na coluna D da respectiva aba e a competência revisada (após a revisão das atribuições) na coluna E. A exportação em PDF respeita a diretoria, o status e a busca selecionados na tela.

## Organograma

A rota `/organograma` mostra as próprias páginas do PDF do organograma de 16/06/2026 (em SVG, na pasta `public/organograma-pdf`) com cada caixa clicável. Clicar numa diretoria na página geral dá zoom para dentro da caixa e abre a página dela; clicar num setor mostra a nova competência, a de 2024 e as observações lidas da planilha (pela mesma rota `/api/records`). Só exibe os textos; a edição continua na página inicial.

- `app/lib/org-chart-pages.ts`: posição de cada caixa em cada página do PDF.
- `app/lib/org-chart.ts`: hierarquia e ligação de cada caixa com a linha da aba (pelo nome da coluna B). Linhas da planilha sem caixa no PDF aparecem na busca, ligadas ao setor acima.

## Apps Script

O código do Apps Script vinculado à planilha fica em `apps-script/Code.gs`. Para atualizá-lo:

1. Na planilha, abra **Extensões → Apps Script** e substitua todo o conteúdo de `Código.gs` pelo arquivo `apps-script/Code.gs`.
2. Em **Configurações do projeto → Propriedades do script**, crie `PORTAL_TOKEN` com o mesmo valor de `GOOGLE_SHEETS_WEBAPP_TOKEN` (ou cole o token em `TOKEN_FIXO`).
3. Selecione a função `prepararColunaCompetenciaRevisada` e clique em **Executar** uma vez: ela cria o cabeçalho e a formatação da coluna E em todas as abas.
4. Em **Implantar → Gerenciar implantações**, edite a implantação atual e escolha **Nova versão**. Assim a URL do Web App continua a mesma e nada muda na Vercel.

Enquanto o Apps Script publicado não enviar a coluna E, o portal continua funcionando normalmente e apenas não mostra o campo de competência revisada.
