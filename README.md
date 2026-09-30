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

### Velocidade da leitura

A leitura da planilha passa por três cópias, da mais rápida para a mais lenta:

1. **Navegador:** a última leitura boa fica guardada no aparelho e aparece na hora ao abrir o portal.
2. **Vercel (Data Cache, via `unstable_cache` com a tag `planilha-registros`):** compartilhada por todas as instâncias. É apagada na hora quando alguém salva pelo portal ou aperta **Atualizar**, e se renova sozinha em segundo plano a cada 5 minutos, para trazer edições feitas direto na planilha. Falhas do Apps Script não são guardadas.
3. **Apps Script (CacheService):** a leitura das nove abas fica guardada por até 6 horas e é atualizada linha a linha a cada gravação.

O navegador nunca recebe o token do Apps Script. O portal lê as nove abas por uma rota do servidor, envia as edições ao Apps Script e mantém a competência atualizada na coluna D da respectiva aba e a competência revisada (após a revisão das atribuições) na coluna E. A exportação em PDF respeita a diretoria, o status e a busca selecionados na tela.

## Observações

A rota `/observacao` é uma tela para escrever a competência revisada e as observações (coluna E) com calma: um setor por vez, sem rolar a página: a nova competência e o campo de observação lado a lado, ocupando a tela, e a competência de 2024 resumida em cima (com "Ver tudo"). Tem busca, filtro por diretoria, "só os que faltam", anterior/próximo, ajuste do tamanho do texto e Ctrl+S para salvar. O link `/observacao?id=…` abre direto num setor; cada setor da página inicial tem um atalho para isso.

## Organograma

A rota `/organograma` mostra as próprias páginas do PDF do organograma de 16/06/2026 (em SVG, na pasta `public/organograma-pdf`) com cada caixa clicável. Clicar numa diretoria na página geral dá zoom para dentro da caixa e abre a página dela; clicar num setor mostra a nova competência, a de 2024 e as observações lidas da planilha (pela mesma rota `/api/records`). Só exibe os textos; a edição continua na página inicial.

- `app/lib/org-chart-pages.ts`: posição de cada caixa em cada página do PDF.
- `app/lib/org-chart.ts`: hierarquia e ligação de cada caixa com a linha da aba (pelo nome da coluna B). Linhas da planilha sem caixa no PDF aparecem na busca, ligadas ao setor acima.

## API oficial do Google Sheets (mais rápida que o Apps Script)

O portal pode ler e gravar direto pela API oficial do Google Sheets, com uma conta de serviço. Salvar cai de 1–3 s para menos de 1 s, e acaba o tempo de "acordar" do Apps Script. **Os dados não mudam de lugar:** a API lê e grava as mesmas células (colunas D e E de cada aba) da mesma planilha; nada é copiado, movido ou apagado. Enquanto a variável `GOOGLE_SERVICE_ACCOUNT_JSON` não existir, o portal continua usando o Apps Script.

### Passo a passo (uma vez só, uns 15 minutos)

**0. Cópia de segurança da planilha.** Na planilha, **Arquivo → Fazer uma cópia** (ou **Arquivo → Histórico de versões → Nomear versão atual**). É só precaução.

**1. Criar um projeto no Google Cloud.** Abra <https://console.cloud.google.com>, clique no seletor de projeto no topo → **Novo projeto** → nome `portal-regimento` → **Criar**. É grátis e não pede cartão. Confira que o projeto novo ficou selecionado no topo.

**2. Ativar a Google Sheets API.** No menu **☰ → APIs e serviços → Biblioteca**, busque **Google Sheets API** → **Ativar**.

**3. Criar a conta de serviço.** Em **APIs e serviços → Credenciais → + Criar credenciais → Conta de serviço**. Nome `portal-regimento` → **Criar e continuar** → pule a parte de papéis/permissões → **Concluir**.

**4. Baixar a chave.** Na lista de contas de serviço, clique na que você criou → aba **Chaves** → **Adicionar chave → Criar nova chave → JSON → Criar**. O navegador baixa um arquivo `.json`. Ele funciona como uma senha: não mande por e-mail ou WhatsApp e não coloque no GitHub. Se aparecer uma mensagem de que a criação de chaves está bloqueada pela organização, crie o projeto com uma conta Google pessoal.

**5. Compartilhar a planilha com a conta de serviço.** Abra o `.json` num editor de texto e copie o valor de `client_email` (termina em `.iam.gserviceaccount.com`). Na planilha, **Compartilhar** → cole esse e-mail → permissão **Editor** → desmarque "Notificar pessoas" → **Compartilhar**.

**6. Colocar a chave na Vercel.** No projeto da Vercel, **Settings → Environment Variables** → **Add**:
- **Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`
- **Value:** o conteúdo **inteiro** do arquivo `.json` (abra no editor de texto, selecione tudo, copie e cole)
- Marque **Production** e **Preview**, ative **Sensitive** e salve.

Não apague as variáveis do Apps Script (`GOOGLE_SHEETS_WEBAPP_URL` e `GOOGLE_SHEETS_WEBAPP_TOKEN`): elas ficam como reserva.

**7. Publicar de novo.** Variáveis novas só valem num deploy novo: **Deployments** → no mais recente, **⋯ → Redeploy**.

**8. Conferir.** Abra o portal, aperte **Atualizar** e salve uma observação. Em **Logs** na Vercel devem aparecer linhas como `[planilha:api] leitura ok em …ms` e `[planilha:api] gravação ok em …ms`. Se aparecer `[planilha] configuration`, a planilha não foi compartilhada com o `client_email` ou a chave foi colada pela metade.

**Para voltar ao Apps Script:** apague a variável `GOOGLE_SERVICE_ACCOUNT_JSON` e faça **Redeploy**.

Opcional: `GOOGLE_SHEETS_SPREADSHEET_ID` troca a planilha usada (por padrão, a "Diretorias x Regimento"). Com a API, edições feitas direto na planilha aparecem no portal em até 5 minutos, ou na hora com **Atualizar**.

## Apps Script

O código do Apps Script vinculado à planilha fica em `apps-script/Code.gs`. Para atualizá-lo:

1. Na planilha, abra **Extensões → Apps Script** e substitua todo o conteúdo de `Código.gs` pelo arquivo `apps-script/Code.gs`.
2. Em **Configurações do projeto → Propriedades do script**, crie `PORTAL_TOKEN` com o mesmo valor de `GOOGLE_SHEETS_WEBAPP_TOKEN` (ou cole o token em `TOKEN_FIXO`).
3. Selecione a função `prepararColunaCompetenciaRevisada` e clique em **Executar** uma vez: ela cria o cabeçalho e a formatação da coluna E em todas as abas.
4. Em **Implantar → Gerenciar implantações**, edite a implantação atual e escolha **Nova versão**. Assim a URL do Web App continua a mesma e nada muda na Vercel.
5. Opcional, para quase nunca esperar a leitura completa: selecione a função `instalarAquecimento` e clique em **Executar** uma vez. Ela cria um gatilho que deixa a cópia dos dados pronta a cada 10 minutos.

O Apps Script guarda uma cópia da leitura das nove abas por até 6 horas. Cada gravação pelo portal atualiza só a linha salva dentro dessa cópia, e qualquer edição feita direto na planilha apaga a cópia (gatilho `onEdit`), então os dados nunca ficam velhos. O tempo de cada chamada aparece nos logs da Vercel como `[planilha] GET ok em …ms`.

Enquanto o Apps Script publicado não enviar a coluna E, o portal continua funcionando normalmente e apenas não mostra o campo de competência revisada.
