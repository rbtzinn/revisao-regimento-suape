# Portal de Revisão do Regimento Interno

Interface privada para revisar as competências do Regimento Interno de 2024 em comparação com o organograma atual. A planilha Google “Diretorias x Regimento” permanece como fonte única dos dados.

## Configuração local

Copie `.env.example` para `.env.local` e preencha:

- `GOOGLE_SHEETS_WEBAPP_URL`: endereço publicado do Apps Script vinculado à planilha.
- `GOOGLE_SHEETS_WEBAPP_TOKEN`: chave compartilhada da integração.

## Comandos

```bash
npm install
npm run dev
npm run build
```

O portal lê as oito abas de diretorias, atualiza apenas a coluna D e bloqueia gravações quando detecta que o texto foi alterado desde a última leitura.
