/**
 * Google Apps Script - 202603 活动报名 · 写入独立 Google Sheet
 * 表头：姓名、邮箱、公司、提交时间、活动
 */

// 请替换为您新建的 202603 用 Google Sheet 的 ID（从 Sheet 的 URL 中复制）
// 例如：https://docs.google.com/spreadsheets/d/这里就是Sheet_ID/edit
const SPREADSHEET_ID = '1-sROFh3aavkFxE6_MqMfg1X84AiOnZVdUmJeTOlJYs0';
const EVENT_LIMITS = {
  '202603': 40
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

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
    var limit = getEventLimit_(eventId);
    if (email && checkExisting_(email, eventId)) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'duplicate', message: '已报名' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (limit !== null) {
      var count = countRegistrations_(eventId);
      if (count >= limit) {
        var cappedCount = Math.min(count, limit);
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'full',
            message: '活动已满',
            limit: limit,
            count: cappedCount,
            remaining: 0
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    sheet.appendRow([
      data.event || '',
      data.name,
      data.email,
      data.company,
      data.timestamp || new Date().toISOString()
    ]);

    try {
      sendConfirmationEmail_(data);
    } catch (mailError) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'email_failed',
          message: '报名已记录，但确认邮件发送失败，请联系主办方。',
          detail: mailError.toString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var finalCount = limit !== null ? countRegistrations_(eventId) : null;
    var displayCount = limit !== null ? Math.min(finalCount, limit) : null;

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '数据已成功提交',
        limit: limit,
        count: displayCount,
        remaining: limit !== null ? Math.max(0, limit - displayCount) : null
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {}
  }
}

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'status') {
    var eventId = (params.event || '').toString().trim();
    var limit = getEventLimit_(eventId);
    var count = eventId ? countRegistrations_(eventId) : 0;
    var displayCount = limit !== null ? Math.min(count, limit) : count;
    var remaining = limit !== null ? Math.max(0, limit - displayCount) : null;

    return respond_({
      success: true,
      event: eventId,
      limit: limit,
      count: displayCount,
      remaining: remaining,
      isFull: limit !== null ? count >= limit : false
    }, params.callback);
  }

  if (params.action === 'check') {
    var email = (params.email || '').toString().trim().toLowerCase();
    var eventId = (params.event || '').toString().trim();
    var exists = false;
    var limit = getEventLimit_(eventId);
    var count = eventId ? countRegistrations_(eventId) : 0;
    var displayCount = limit !== null ? Math.min(count, limit) : count;

    if (email) {
      exists = checkExisting_(email, eventId);
    }

    return respond_({
      success: true,
      exists: exists,
      limit: limit,
      count: displayCount,
      remaining: limit !== null ? Math.max(0, limit - displayCount) : null,
      isFull: limit !== null ? count >= limit : false
    }, params.callback);
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

function countRegistrations_(eventId) {
  if (!eventId) {
    return 0;
  }

  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return 0;
  }

  var header = values[0];
  var eventIndex = header.indexOf('活动');
  if (eventIndex === -1) {
    return Math.max(0, values.length - 1);
  }

  var count = 0;
  for (var i = 1; i < values.length; i++) {
    var rowEvent = (values[i][eventIndex] || '').toString().trim();
    if (rowEvent === eventId) {
      count++;
    }
  }
  return count;
}

function getEventLimit_(eventId) {
  if (!eventId || !EVENT_LIMITS.hasOwnProperty(eventId)) {
    return null;
  }
  return EVENT_LIMITS[eventId];
}

function sendConfirmationEmail_(data) {
  var recipient = (data.email || '').toString().trim();
  if (!recipient) {
    throw new Error('missing_recipient');
  }

  var attendeeName = (data.name || '').toString().trim() || '朋友';
  var subject = '【报名确认】TGO 硅谷分会活动：From Prompt to Product + Share Your 🦞';
  var body = [
    attendeeName + '，您好：',
    '',
    '感谢报名 TGO 硅谷分会活动，现确认您的报名已成功。',
    '',
    '活动信息：From Prompt to Product + Share Your 🦞',
    '时间：',
    '2026年3月21日（周六）',
    '16:00-20:00',
    '活动现场提供晚餐。',
    '地点：',
    '120 Rizal Drive, Hillsborough, CA',
    '主办：',
    'TGO 硅谷分会',
    '',
    '请按时到场。如活动安排有更新，我们会通过邮件另行通知。',
    '',
    '期待与您现场交流。'
  ].join('\n');

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    name: 'TGO 硅谷分会'
  });
}
