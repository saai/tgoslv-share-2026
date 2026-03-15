/**
 * Google Apps Script - 202603 活动报名 · 写入独立 Google Sheet
 * 表头：姓名、邮箱、公司、提交时间、活动
 */

// 请替换为您新建的 202603 用 Google Sheet 的 ID（从 Sheet 的 URL 中复制）
// 例如：https://docs.google.com/spreadsheets/d/这里就是Sheet_ID/edit
const SPREADSHEET_ID = '1-sROFh3aavkFxE6_MqMfg1X84AiOnZVdUmJeTOlJYs0';

function doPost(e) {
  try {
    var data = {};
    if (e.parameter) {
      data = {
        name: e.parameter.name || '',
        email: e.parameter.email || '',
        company: e.parameter.company || '',
        timestamp: e.parameter.timestamp || new Date().toISOString(),
        event: e.parameter.event || ''
      };
    } else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
        data.event = data.event || '';
      } catch (err) {}
    }

    if (!data.name || !data.email || !data.company) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: '缺少必要字段' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['活动', '姓名', '邮箱', '公司', '提交时间']);
    }

    var email = (data.email || '').toString().trim().toLowerCase();
    var eventId = (data.event || '').toString().trim();
    if (email && checkExisting_(email, eventId)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'duplicate', message: '已报名' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([
      data.event || '',
      data.name,
      data.email,
      data.company,
      data.timestamp || new Date().toISOString()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: '数据已成功提交' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'check') {
    var email = (params.email || '').toString().trim().toLowerCase();
    var eventId = (params.event || '').toString().trim();
    var exists = false;

    if (email) {
      exists = checkExisting_(email, eventId);
    }

    return respond_({ success: true, exists: exists }, params.callback);
  }

  return respond_({ status: 'OK', message: 'Google Apps Script 已就绪' }, params.callback);
}

function respond_(payload, callback) {
  var text = JSON.stringify(payload);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + text + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.JSON);
}

function checkExisting_(email, eventId) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return false;
  }

  var header = values[0];
  var emailIndex = header.indexOf('邮箱');
  var eventIndex = header.indexOf('活动');
  if (emailIndex === -1) {
    return false;
  }

  for (var i = 1; i < values.length; i++) {
    var rowEmail = (values[i][emailIndex] || '').toString().trim().toLowerCase();
    if (!rowEmail) {
      continue;
    }
    if (rowEmail === email) {
      if (!eventId || eventIndex === -1) {
        return true;
      }
      var rowEvent = (values[i][eventIndex] || '').toString().trim();
      if (rowEvent === eventId) {
        return true;
      }
    }
  }

  return false;
}
