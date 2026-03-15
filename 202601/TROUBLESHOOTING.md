# 故障排除指南

如果表单提交后数据没有出现在 Google Sheet 中，请按照以下步骤排查：

## 1. 检查 Google Apps Script 部署

### 确认部署设置
1. 打开 Google Apps Script 编辑器
2. 点击 **部署** > **管理部署**
3. 确认：
   - 部署类型是 **网页应用**
   - **执行身份** 设置为 **我**
   - **具有访问权限的用户** 设置为 **任何人**（重要！）
   - 版本是 **最新版本** 或 **新版本**

### 重新部署（如果需要）
1. 在 Apps Script 编辑器中，点击 **部署** > **管理部署**
2. 点击部署旁边的 **编辑**（铅笔图标）
3. 点击 **版本** 下拉菜单，选择 **新版本**
4. 点击 **部署**
5. 复制新的 Web App URL
6. 更新 `index.html` 中的 `GOOGLE_SCRIPT_URL`

## 2. 检查 Google Sheet 权限

1. 打开 Google Sheet：https://docs.google.com/spreadsheets/d/14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY/edit
2. 确认 Sheet 的共享设置允许 Apps Script 访问
3. 确认 Sheet 第一行有表头（如果没有，Apps Script 会自动添加）

## 3. 检查 Apps Script 执行日志

1. 在 Apps Script 编辑器中，点击 **查看** > **执行日志**
2. 提交表单后，查看日志中是否有错误信息
3. 如果有错误，记录错误信息并检查：
   - Sheet ID 是否正确
   - 权限是否正确设置
   - 代码语法是否正确

## 4. 测试 Google Apps Script 连接

在浏览器中访问以下 URL（将 YOUR_URL 替换为您的 Web App URL）：
```
https://script.google.com/macros/s/YOUR_URL/exec
```

如果看到 `{"status":"OK","message":"Google Apps Script 已就绪"}`，说明连接正常。

## 5. 检查浏览器控制台

1. 打开 `index.html` 页面
2. 按 `F12` 或 `Cmd+Option+I` 打开开发者工具
3. 切换到 **Console**（控制台）标签
4. 提交表单
5. 查看是否有错误信息或调试日志

## 6. 手动测试 Google Apps Script

在 Apps Script 编辑器中，可以创建一个测试函数：

```javascript
function testWrite() {
  const spreadsheet = SpreadsheetApp.openById('14g8IJ5DAMIPVL35ir39OU_zY_t_T7Kw__vjoofZolOY');
  const sheet = spreadsheet.getActiveSheet();
  sheet.appendRow(['测试', 'test@example.com', '测试公司', new Date().toISOString()]);
  Logger.log('测试数据已写入');
}
```

运行这个函数，检查数据是否成功写入 Sheet。

## 7. 常见问题

### 问题：数据没有写入
**可能原因：**
- Web App 权限设置不正确（必须是"任何人"）
- Sheet ID 错误
- Apps Script 代码有错误

**解决方法：**
- 检查执行日志
- 重新部署 Web App
- 确认 Sheet ID 正确

### 问题：CORS 错误
**说明：** 由于使用了 `no-cors` 模式，浏览器无法读取响应，这是正常的。数据仍会成功提交。

### 问题：表单提交后没有反馈
**解决方法：**
- 检查浏览器控制台是否有错误
- 等待几秒后检查 Google Sheet
- 查看 Apps Script 执行日志

## 8. 验证数据格式

确认提交的数据格式正确：
- 姓名：文本
- 邮箱：有效的邮箱格式
- 公司：文本
- 时间戳：ISO 8601 格式

## 9. 联系支持

如果以上步骤都无法解决问题，请提供以下信息：
1. 浏览器控制台的错误信息
2. Apps Script 执行日志的错误信息
3. 使用的浏览器和版本
4. 提交的数据示例（不含敏感信息）
