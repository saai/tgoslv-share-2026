# 修复 403 (Forbidden) 错误

403 错误表示 Google Apps Script 拒绝了请求。这通常是由于权限或授权问题引起的。

## 解决方案 1：重新授权 Apps Script（最重要）

### 步骤 1：检查 Apps Script 授权

1. **打开 Google Apps Script 编辑器**
   - 打开您的 Google Sheet
   - 点击 **扩展程序** > **Apps Script**

2. **运行授权流程**
   - 在代码编辑器中，点击 **运行**（▶️）按钮
   - 选择 `doGet` 或 `doPost` 函数
   - 点击运行
   - 如果提示授权，点击 **授权访问**
   - 选择您的 Google 账号
   - 点击 **高级** > **前往 [项目名称]（不安全）**
   - 点击 **允许**

3. **确认权限**
   - 确保允许访问 Google Sheets
   - 确保允许作为 Web 应用运行

### 步骤 2：重新部署 Web App

1. **删除旧部署**
   - 点击 **部署** > **管理部署**
   - 点击部署旁边的 **删除**（垃圾桶图标）
   - 确认删除

2. **创建新部署**
   - 点击 **部署** > **新建部署**
   - 点击 **选择类型** 旁边的齿轮图标 ⚙️
   - 选择 **网页应用**

3. **设置部署选项**
   - **说明**：Vibe Engineering Registration
   - **执行身份**：选择 **我**
   - **具有访问权限的用户**：**必须选择 "任何人"** ⚠️
   - 点击 **部署**

4. **复制新的 Web App URL**
   - 复制显示的 **Web 应用 URL**
   - 更新 `index.html` 中的 `GOOGLE_SCRIPT_URL`

## 解决方案 2：检查 Google Sheet 权限

1. **打开 Google Sheet**
   - 访问：https://docs.google.com/spreadsheets/d/14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY/edit

2. **检查共享设置**
   - 点击右上角的 **共享** 按钮
   - 确保 Sheet 至少对您的账号可编辑
   - 如果 Sheet 是私有的，确保 Apps Script 使用的账号有访问权限

## 解决方案 3：检查 Apps Script 代码中的 Sheet ID

1. **确认 Sheet ID 正确**
   - 打开 `google-apps-script.js` 文件
   - 确认 `SPREADSHEET_ID` 是：`14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY`

2. **测试 Sheet 访问**
   - 在 Apps Script 编辑器中，运行以下测试函数：
   ```javascript
   function testSheetAccess() {
     const spreadsheet = SpreadsheetApp.openById('14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY');
     const sheet = spreadsheet.getActiveSheet();
     Logger.log('Sheet name: ' + sheet.getName());
     Logger.log('Last row: ' + sheet.getLastRow());
   }
   ```
   - 如果出现权限错误，需要重新授权

## 解决方案 4：使用新的 Web App URL

如果重新部署后 URL 有变化，请更新 HTML 文件：

1. **找到 URL 定义**
   - 打开 `index.html`
   - 找到：`const GOOGLE_SCRIPT_URL = '...'`

2. **更新 URL**
   - 将 URL 替换为新的 Web App URL
   - 确保 URL 以 `/exec` 结尾

## 解决方案 5：检查执行日志

1. **查看执行日志**
   - 在 Apps Script 编辑器中，点击 **查看** > **执行日志**
   - 提交表单后，查看日志中的错误信息

2. **常见错误信息**
   - `Exception: You do not have permission to call openById` - 需要重新授权
   - `Exception: Access denied` - Sheet 权限问题
   - `Exception: Script function not found` - 函数名称错误

## 完整检查清单

- [ ] Apps Script 已授权访问 Google Sheets
- [ ] Web App 部署设置为"任何人"可访问
- [ ] Web App 已重新部署（创建新版本）
- [ ] Google Sheet 对 Apps Script 账号可访问
- [ ] Sheet ID 在代码中正确设置
- [ ] HTML 中的 Web App URL 是最新的
- [ ] 执行日志中没有权限错误

## 如果问题仍然存在

1. **完全重新设置**
   - 删除所有旧部署
   - 重新授权 Apps Script
   - 创建全新的部署
   - 使用新的 URL

2. **检查浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 标签中的详细错误信息
   - 查看 Network 标签，检查请求的详细信息

3. **测试 Web App 直接访问**
   - 在浏览器中直接访问 Web App URL
   - 如果看到 `{"status":"OK","message":"Google Apps Script 已就绪"}`，说明 Web App 正常
   - 如果看到错误页面，说明权限设置有问题

## 替代方案

如果 403 错误持续存在，可以考虑：

1. **使用 Google Forms**
   - 创建 Google Form 并链接到 Sheet
   - 使用 iframe 嵌入表单

2. **使用第三方服务**
   - Formspree
   - Google Forms API
   - 其他表单处理服务

3. **自建后端服务**
   - 使用 Node.js、Python 等创建后端
   - 通过后端调用 Google Sheets API
