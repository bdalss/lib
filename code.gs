// スプレッドシートやシートの名前をここで定義
const SPREADSHEET_NAME = "LSS_Taiyo_svg"; // 指定されたスプレッドシート名
const SHEET_NAME = "座席状況";           // シート名（必要に応じて変更してください）

/**
 * Webページへのアクセス時に実行される関数
 */
function doGet(e) {
  const htmlTemplate = HtmlService.createTemplateFromFile("index");
  return htmlTemplate.evaluate()
      .setTitle("自習室 空席状況")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Webページ（ブラウザ）から呼び出され、座席データを返す関数
 */
function getSeatData() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const dataRange = sheet.getRange("A2:B" + sheet.getLastRow());
    const values = dataRange.getValues();
    return values;
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * マイクロコントローラーから呼び出され、複数の座席データを一括で更新する関数
 * @param {Object} e - リクエスト情報を含むイベントオブジェクト
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const updates = payload.updates;

    if (!updates || !Array.isArray(updates)) {
      throw new Error("無効なデータ形式です。'updates'配列が必要です。");
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange("A2:B" + lastRow);
    const values = range.getValues();
    
    let updatedCount = 0;
    const errors = [];

    const seatIdMap = {};
    for (let i = 0; i < values.length; i++) {
      const seatId = values[i][0];
      seatIdMap[seatId] = i;
    }

    updates.forEach(update => {
      const seatId = update.seatId;
      const newStatus = update.status;

      if (seatId in seatIdMap) {
        const rowIndex = seatIdMap[seatId];
        values[rowIndex][1] = newStatus;
        updatedCount++;
      } else {
        errors.push(`seatId '${seatId}' は見つかりませんでした。`);
      }
    });

    if (updatedCount > 0) {
      range.setValues(values);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: `${updatedCount}件の座席を更新しました。`,
      errors: errors
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
