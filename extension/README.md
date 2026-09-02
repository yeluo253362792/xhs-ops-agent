# 小红书运营助手 - 浏览器扩展

将小红书运营助手生成的内容半自动发布到小红书创作服务平台。

## 功能

- 从 Web App 接收发布任务
- 在小红书创作服务平台自动填充标题、正文、标签、图片
- 每个字段填充状态可视化，失败支持手动补全
- 最终发布动作由用户手动确认

## 开发

```bash
cd extension
npm install
npm run dev
```

然后打开 Chrome 扩展管理页 `chrome://extensions/`，开启“开发者模式”，点击“加载已解压的扩展程序”，选择 `extension/dist` 文件夹。

## 构建

```bash
npm run build
```

构建产物在 `extension/dist` 目录。

## 测试

```bash
npm test
```

## 配置

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WEB_APP_URL=http://localhost:3000
```

## 注意事项

- 扩展需要 Web App 登录后获取 publish token
- 图片通过后端临时存储 + 预签名 URL 下载
- 不保存用户小红书账号密码
- 不自动点击最终“发布”按钮
