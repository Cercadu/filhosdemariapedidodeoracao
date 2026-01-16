function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function doGet() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  const pedidos = data.map((row, i) => ({
    linha: i + 2,
    data: row[0],
    nome: row[1],
    pedido: row[2],
    anonimo: row[3],
    status: row[4] || ""
  }));

  return ContentService
    .createTextOutput(JSON.stringify(pedidos))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const sheet = getSheet();

  // Coluna E = Status
  sheet.getRange(body.linha, 5).setValue("Orando");

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
