/**
 * Deploy this file as a Google Apps Script web app while signed in as
 * kuwarvishwajeetsingh@gmail.com. It creates/uses a spreadsheet in that
 * Google Drive and appends every website suggestion as a row.
 */
const SPREADSHEET_NAME = 'PoshanFlow Suggestions';
const SHEET_NAME = 'Suggestions';

function doPost(event) {
  const data = JSON.parse(event.postData.contents || '{}');
  const email = String(data.email || '').trim();
  const message = String(data.message || '').trim();
  if (!email || !message) return jsonResponse({ success: false, error: 'Email and message are required.' });

  const sheet = getSuggestionsSheet();
  sheet.appendRow([new Date(), email, message]);
  return jsonResponse({ success: true });
}

function getSuggestionsSheet() {
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  const spreadsheet = files.hasNext()
    ? SpreadsheetApp.open(files.next())
    : SpreadsheetApp.create(SPREADSHEET_NAME);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Submitted at', 'Email', 'Suggestion']);
  return sheet;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
