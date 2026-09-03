# 明晰 · 通知校编器

一个围绕学生工作通知编写、修改和检查设计的单文件 AI 客户端。程序直接在浏览器中运行，通过 OpenAI Chat Completions 兼容接口调用模型，并在本地检索工作手册中与当前任务相关的章节。

## 功能

- 编写通知：根据不少于 50 字的事实材料生成通知。
- 修改通知：结合原通知和修改要求生成完整的新版本。
- 检查通知：检查事实完整性、前后冲突、歧义和可执行性。
- 本地手册检索：Markdown/TXT 手册按标题和段落切分，每轮最多发送 4 个相关片段、合计不超过 4,000 字。
- 连续对话：可以补充事实或继续调整，支持停止流式生成。
- 消息信息：显示字符数、实际调用模型，以及接口返回的发送/接收 token 数。
- 本地保存：接口设置、系统提示词、工作手册和对话历史都保存在当前浏览器。
- 快捷复制：支持复制单条消息和整个对话。

## 快速开始

程序没有构建步骤和外部依赖，直接打开 `index.html` 即可使用。也可以通过本地 HTTP 服务打开：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

第一次打开时，程序会依次要求：

1. 阅读使用帮助；
2. 导入 Markdown 或 TXT 格式的工作手册；
3. 配置 Base URL、API Key、模型名称和系统提示词。

完成后选择编写、修改或检查模式并提交材料。使用 `Ctrl/⌘ + Enter` 可以快速生成或发送消息。

## 模型接口

程序调用 OpenAI 兼容的 `/chat/completions` 接口。如果 Base URL 未包含该路径，程序会自动补全。

设置页内置以下快捷预设：

| 服务 | Base URL | 默认模型 |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4.1-mini` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-flash` |

模型名称可以自由修改。使用其他兼容服务时，直接填写服务商提供的 Base URL 和模型名称即可。本地服务如果不需要鉴权，可以留空 API Key。

流式请求会携带 `stream_options.include_usage: true`。如果兼容接口没有返回 `usage`，页面会显示“Token 用量未提供”，不会自行估算。

## 工作手册

手册支持 `.md`、`.markdown` 和 `.txt` 文件，大小限制为 1 MB，至少需要 100 字。导入过程完全在浏览器中完成，整本手册不会直接上传。

Markdown 文件会按照标题层级建立章节路径；没有标题的文本会按照段落切分。每次请求时，程序根据首次任务材料和最近两条用户补充，在本地选出相关内容并附加到系统消息中。低相关度时不会发送手册片段。

仓库中的 `local-handbooks/` 用于存放本地手册和其他不应提交的资料，整个目录已被 Git 忽略。

## 本地数据

程序使用 `localStorage` 保存以下数据：

| Key | 内容 |
| --- | --- |
| `mingxi.settings.v1` | Base URL、API Key、模型和系统提示词 |
| `mingxi.handbook.v1` | 导入的手册及文件信息 |
| `mingxi.conversations.v1` | 对话历史、模型、token 用量和引用章节 |
| `mingxi.help-seen.v1` | 是否已看过首次帮助 |

清除网站数据或使用浏览器隐私模式可能导致这些内容丢失。这个版本将 API Key 直接保存在浏览器本地，适合可信设备上的个人使用。

## 项目文件

```text
index.html          单文件应用，包含 HTML、CSS 和 JavaScript
README.md           项目说明
QQ 通知规范.md      通知写作规范参考
可用的提示词.md     默认提示词的原始参考
local-handbooks/    本地手册目录，不纳入 Git
```

## 常见问题

- **接口返回 401**：检查 API Key 是否正确，并确认它属于当前接口服务。
- **接口返回 404**：检查 Base URL；通常只需要填写到服务的 API 根路径。
- **浏览器提示跨域错误**：对应接口需要允许浏览器发起跨域请求。无法调整服务端时，可通过允许跨域的本地代理访问。
- **没有 token 数量**：部分兼容接口不返回流式 `usage`，不影响正常生成。
- **更换手册或提示词**：打开右上角“设置”，可以替换手册、修改系统提示词或恢复默认提示词。

## 开发说明

所有功能都位于 `index.html`，修改后无需打包。提交前至少检查：

```bash
node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.match(/<script>([\\s\\S]*?)<\\/script>/)[1]);console.log('JavaScript syntax OK')"
```
