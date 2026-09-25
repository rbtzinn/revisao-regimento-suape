/**
 * Apps Script vinculado à planilha "Diretorias x Regimento".
 *
 * Colunas de cada aba de diretoria (dados a partir da linha 7):
 *   A  Nome no regimento de 2024
 *   B  Nome no organograma atual
 *   C  Competência de 2024
 *   D  Competência para o novo regimento
 *   E  Competência revisada (após a revisão das atribuições)
 *
 * O token precisa ser o mesmo de GOOGLE_SHEETS_WEBAPP_TOKEN na Vercel.
 * Guarde-o em Configurações do projeto → Propriedades do script, com o
 * nome PORTAL_TOKEN, ou cole-o em TOKEN_FIXO abaixo.
 */

const TOKEN_FIXO = "";

const DIRECTORATES = [
  "Auditoria Interna",
  "Presidência",
  "Jurídica",
  "Relações Inst.",
  "Gestão Portuária",
  "Infraestrutura",
  "Sustentab. Inov.",
  "Adm. Finanças",
  "Gestão Industrial",
];

const HEADER_ROW = 6;
const FIRST_DATA_ROW = 7;
const COLUMN_COUNT = 5; // A:E

const FIELD_COLUMNS = {
  newCompetence: 4, // D
  reviewedCompetence: 5, // E
};

const REVIEWED_HEADER = "COMPETÊNCIA REVISADA (APÓS REVISÃO)";

function doGet(e) {
  try {
    if (!isAuthorized((e && e.parameter && e.parameter.token) || "")) {
      return failure("UNAUTHORIZED", "Token inválido.");
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const records = [];

    DIRECTORATES.forEach(function (directorate) {
      const sheet = spreadsheet.getSheetByName(directorate);
      if (!sheet) return;

      const lastRow = sheet.getLastRow();
      if (lastRow < FIRST_DATA_ROW) return;

      const values = sheet
        .getRange(FIRST_DATA_ROW, 1, lastRow - FIRST_DATA_ROW + 1, COLUMN_COUNT)
        .getDisplayValues();

      values.forEach(function (row, index) {
        const isEmpty = row.slice(0, 4).every(function (cell) {
          return String(cell).trim() === "";
        });
        if (isEmpty) return;
        records.push(toRecord(sheet, directorate, FIRST_DATA_ROW + index, row));
      });
    });

    return json({
      ok: true,
      records: records,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return failure("INTERNAL", String(error && error.message ? error.message : error));
  }
}

function doPost(e) {
  let input;
  try {
    input = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (error) {
    return failure("INVALID_JSON", "Corpo da requisição inválido.");
  }

  if (!isAuthorized(input.token || "")) {
    return failure("UNAUTHORIZED", "Token inválido.");
  }

  // Portais antigos não enviam `field` e sempre editam a coluna D.
  const field = input.field || "newCompetence";
  const column = FIELD_COLUMNS[field];
  const rowNumber = Number(input.rowNumber);

  if (
    DIRECTORATES.indexOf(input.directorate) === -1 ||
    !column ||
    !Number.isInteger(rowNumber) ||
    rowNumber < FIRST_DATA_ROW ||
    typeof input.competence !== "string" ||
    typeof input.expectedCompetence !== "string"
  ) {
    return failure("INVALID_INPUT", "Dados de atualização inválidos.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(input.directorate);
  if (!sheet || rowNumber > sheet.getLastRow()) {
    return failure("NOT_FOUND", "Linha não encontrada na planilha.");
  }

  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) {
    return failure("BUSY", "A planilha está ocupada. Tente novamente.");
  }

  try {
    const cell = sheet.getRange(rowNumber, column);
    const currentValue = String(cell.getDisplayValue());

    if (normalize(currentValue) !== normalize(input.expectedCompetence)) {
      return json({
        ok: false,
        code: "CONFLICT",
        error: "O texto foi alterado por outra pessoa.",
        currentValue: currentValue,
      });
    }

    cell.setValue(input.competence);
    SpreadsheetApp.flush();

    const row = sheet.getRange(rowNumber, 1, 1, COLUMN_COUNT).getDisplayValues()[0];
    return json({
      ok: true,
      record: toRecord(sheet, input.directorate, rowNumber, row),
      updatedAt: new Date().toISOString(),
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Execute uma vez pelo editor (menu Executar) para criar o cabeçalho e a
 * formatação da coluna E em todas as abas de diretoria. Pode ser repetida
 * sem apagar nada que já tenha sido digitado na coluna E.
 */
function prepararColunaCompetenciaRevisada() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  DIRECTORATES.forEach(function (directorate) {
    const sheet = spreadsheet.getSheetByName(directorate);
    if (!sheet) return;

    const lastRow = Math.max(sheet.getLastRow(), FIRST_DATA_ROW);
    const source = sheet.getRange(HEADER_ROW, 4, lastRow - HEADER_ROW + 1, 1);
    const target = sheet.getRange(HEADER_ROW, 5, lastRow - HEADER_ROW + 1, 1);

    source.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    sheet.setColumnWidth(5, sheet.getColumnWidth(4));

    const header = sheet.getRange(HEADER_ROW, 5);
    if (String(header.getDisplayValue()).trim() === "") {
      header.setValue(REVIEWED_HEADER);
    }

    // Estende os títulos mesclados (linhas 1 a 5) até a coluna E.
    sheet
      .getRange(1, 1, HEADER_ROW - 1, 4)
      .getMergedRanges()
      .forEach(function (merged) {
        if (merged.getColumn() !== 1 || merged.getLastColumn() !== 4) return;
        const row = merged.getRow();
        const rows = merged.getNumRows();
        merged.breakApart();
        sheet.getRange(row, 1, rows, 5).merge();
      });
  });
}

function toRecord(sheet, directorate, rowNumber, row) {
  return {
    id: sheet.getSheetId() + ":" + rowNumber,
    directorate: directorate,
    sheetId: sheet.getSheetId(),
    rowNumber: rowNumber,
    previousName: String(row[0]),
    currentName: String(row[1]),
    previousCompetence: String(row[2]),
    newCompetence: String(row[3]),
    reviewedCompetence: String(row[4] === undefined ? "" : row[4]),
  };
}

function isAuthorized(token) {
  const expected =
    PropertiesService.getScriptProperties().getProperty("PORTAL_TOKEN") || TOKEN_FIXO;
  return Boolean(expected) && token === expected;
}

function normalize(value) {
  return String(value).replace(/\r\n/g, "\n");
}

function failure(code, message) {
  return json({ ok: false, code: code, error: message });
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
