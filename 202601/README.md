# Vibe Engineering 2026.1 活动页面

## 功能说明

这是一个活动报名页面，包含以下功能：
- 活动信息展示
- 在线报名表单（姓名、邮箱、公司）
- 自动将报名信息提交到 Google Sheet

## 设置步骤

### 1. 创建 Google Sheet

1. 在 Google Drive 中创建一个新的 Google Sheet
2. 在第一行添加表头（A1-D1）：
   - A1: 姓名
   - B1: 邮箱
   - C1: 公司
   - D1: 提交时间
3. 复制 Sheet 的 ID（从 URL 中获取）
   - URL 格式：`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - 复制 `SPREADSHEET_ID` 部分

### 2. 创建 Google Apps Script

1. 打开刚才创建的 Google Sheet
2. 点击菜单：**扩展程序** > **Apps Script**
3. 删除默认代码，将 `google-apps-script.js` 文件中的代码粘贴进去
4. 将代码中的 `YOUR_SPREADSHEET_ID_HERE` 替换为您的 Sheet ID
5. 点击 **保存**（💾 图标）或按 `Cmd+S` / `Ctrl+S`
6. 给项目命名（例如：Vibe Engineering Registration）

### 3. 部署为 Web App

1. 在 Apps Script 编辑器中，点击 **部署** > **新建部署**
2. 点击 **选择类型** 旁边的齿轮图标 ⚙️
3. 选择 **网页应用**
4. 设置以下选项：
   - **说明**：可以填写 "Vibe Engineering Registration Form"
   - **执行身份**：选择 **我**
   - **具有访问权限的用户**：选择 **任何人**（这样任何人都可以提交表单）
5. 点击 **部署**
6. 首次部署需要授权：
   - 点击 **授权访问**
   - 选择您的 Google 账号
   - 点击 **高级** > **前往 [项目名称]（不安全）**
   - 点击 **允许**
7. 复制 **Web 应用 URL**（类似：`https://script.google.com/macros/s/.../exec`）

### 4. 更新 HTML 文件

1. 打开 `index.html` 文件
2. 找到这一行：
   ```javascript
   const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE';
   ```
3. 将 `YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE` 替换为您刚才复制的 Web 应用 URL
4. 保存文件

### 5. 测试

1. 在浏览器中打开 `index.html`
2. 填写报名表单并提交
3. 检查 Google Sheet 中是否出现了新提交的数据

## 文件说明

- `index.html` - 主页面文件，包含活动信息和报名表单
- `google-apps-script.js` - Google Apps Script 代码，用于处理表单提交
- `README.md` - 本说明文件

## 注意事项

1. **安全性**：当前设置为任何人都可以提交表单。如果需要对提交进行限制，可以在 Google Apps Script 中添加验证逻辑。

2. **CORS 问题**：由于浏览器的 CORS 限制，代码使用了 `no-cors` 模式。这意味着无法直接读取响应，但数据仍会成功提交到 Sheet。

3. **错误处理**：如果提交失败，用户会看到错误提示。建议定期检查 Google Sheet 以确保数据正常接收。

4. **数据格式**：提交的数据会自动添加时间戳，格式为 ISO 8601。

## 故障排除

- **数据没有出现在 Sheet 中**：
  - 检查 Sheet ID 是否正确
  - 确认 Apps Script 已正确部署
  - 检查 Apps Script 的执行日志（查看 > 执行日志）

- **表单提交失败**：
  - 检查 Web App URL 是否正确
  - 确认 Web App 的访问权限设置为"任何人"
  - 检查浏览器控制台是否有错误信息

- **权限问题**：
  - 确保已正确授权 Apps Script 访问 Google Sheet
  - 检查 Sheet 的共享设置
