/**
 * Google Apps Script - 将表单数据写入 Google Sheet
 * 
 * 使用说明：
 * 1. 在 Google Drive 中创建一个新的 Google Sheet
 * 2. 在 Sheet 的第一行添加表头：姓名、邮箱、公司、提交时间
 * 3. 打开 Google Apps Script 编辑器 (扩展程序 > Apps Script)
 * 4. 将下面的代码粘贴到编辑器
 * 5. 将 SPREADSHEET_ID 替换为您的 Google Sheet ID（从 URL 中获取）
 * 6. 保存并部署为 Web App
 */

// Google Sheet ID
// Sheet URL: https://docs.google.com/spreadsheets/d/14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY/edit
const SPREADSHEET_ID = '14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY';

function doPost(e) {
  try {
    // 记录接收到的数据（用于调试）
    Logger.log('Received data: ' + JSON.stringify(e));
    
    // 提取数据
    let data = {};
    
    // 优先尝试从 parameter 获取（表单编码格式）
    if (e.parameter) {
      data = {
        name: e.parameter.name || '',
        email: e.parameter.email || '',
        company: e.parameter.company || '',
        timestamp: e.parameter.timestamp || new Date().toISOString(),
        event: e.parameter.event || ''
      };
    }
    // 如果没有 parameter，尝试从 postData.contents 解析 JSON
    else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
        data.event = data.event || '';
      } catch (parseError) {
        Logger.log('JSON parse error: ' + parseError.toString());
      }
    }
    
    Logger.log('Extracted data: ' + JSON.stringify(data));
    
    // 验证必要字段
    if (!data.name || !data.email || !data.company) {
      Logger.log('Missing required fields');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: '缺少必要字段',
          received: data
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 打开 Google Sheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getActiveSheet();
    
    // 如果 Sheet 为空，添加表头（「活动」在第一列，用于区分 202601 / 202603）
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['活动', '姓名', '邮箱', '公司', '提交时间']);
    }
    
    const email = (data.email || '').toString().trim().toLowerCase();
    const eventId = (data.event || '').toString().trim();
    if (email && checkExisting_(email, eventId)) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'duplicate',
          message: '已报名'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 添加新行数据
    sheet.appendRow([
      data.event || '',
      data.name,
      data.email,
      data.company,
      data.timestamp || new Date().toISOString()
    ]);
    
    Logger.log('Data successfully written to sheet');
    
    // 返回成功响应
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '数据已成功提交'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // 记录详细错误日志
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    // 返回错误响应
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'check') {
    const email = (params.email || '').toString().trim().toLowerCase();
    const eventId = (params.event || '').toString().trim();
    let exists = false;

    if (email) {
      exists = checkExisting_(email, eventId);
    }

    return respond_({ success: true, exists: exists }, params.callback);
  }

  return respond_({
    status: 'OK',
    message: 'Google Apps Script 已就绪'
  }, params.callback);
}

function respond_(payload, callback) {
  const text = JSON.stringify(payload);
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
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getActiveSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return false;
  }

  const header = values[0];
  const emailIndex = header.indexOf('邮箱');
  const eventIndex = header.indexOf('活动');
  if (emailIndex === -1) {
    return false;
  }

  for (let i = 1; i < values.length; i++) {
    const rowEmail = (values[i][emailIndex] || '').toString().trim().toLowerCase();
    if (!rowEmail) {
      continue;
    }
    if (rowEmail === email) {
      if (!eventId || eventIndex === -1) {
        return true;
      }
      const rowEvent = (values[i][eventIndex] || '').toString().trim();
      if (rowEvent === eventId) {
        return true;
      }
    }
  }

  return false;
}
