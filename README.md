# 魔搭图像生成 MCP 服务

[![npm version](https://badge.fury.io/js/moda-image-mcp.svg)](https://www.npmjs.com/package/moda-image-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

这是一个用于 Claude Code、Gemini CLI、Qwen Code 等 AI 编辑器的 MCP (Model Context Protocol) 服务器，集成了魔搭 ModelScope 的图像生成能力。

## 功能特性

- 🎨 使用魔搭平台的 FLUX 等先进图像生成模型
- 🔄 支持异步任务处理，自动轮询生成状态
- 💾 自动保存图片到用户的"下载"文件夹，支持自定义路径
- 🖼️ 在 AI 编辑器中直接显示生成的图片
- 🔍 智能检测图片格式 (PNG/JPEG/GIF/WebP)
- ⏰ 带时间戳的文件命名，避免覆盖
- 📦 **通过 npm 安装，无需克隆仓库或配置路径**

## 安装

### 方式一：通过 npm 全局安装（推荐）

```bash
npm install -g moda-image-mcp
```

### 方式二：直接使用 npx（无需安装）

直接在配置中使用 `npx moda-image-mcp`，会自动下载并运行。

## 配置

### 获取 API 密钥

1. 访问 [魔搭 ModelScope](https://modelscope.cn/) 注册账号
2. 在个人设置中获取 API Key

### Claude Code / Cursor

在 `~/.cursor/mcp.json` 或项目根目录的 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "npx",
      "args": ["-y", "moda-image-mcp"],
      "env": {
        "MODA_API_KEY": "你的魔搭API密钥"
      }
    }
  }
}
```

### Gemini CLI

在 `~/.gemini/settings.json` 中添加：

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "npx",
      "args": ["-y", "moda-image-mcp"],
      "env": {
        "MODA_API_KEY": "你的魔搭API密钥"
      }
    }
  }
}
```

### VS Code + Continue

在 Continue 配置文件中添加：

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "npx",
      "args": ["-y", "moda-image-mcp"],
      "env": {
        "MODA_API_KEY": "你的魔搭API密钥"
      }
    }
  }
}
```

### 如果全局安装了 npm 包

可以直接使用 `moda-image-mcp` 命令：

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "moda-image-mcp",
      "env": {
        "MODA_API_KEY": "你的魔搭API密钥"
      }
    }
  }
}
```

## 使用方法

配置完成后，在 AI 编辑器中直接使用自然语言请求生成图片：

### 基础使用

```
生成一张金色小猫的图片
```

图片将保存到默认的"下载"文件夹。

### 指定保存路径

```
生成一张蓝色汽车的图片，保存到 ~/Desktop/my_car.jpg
```

### 指定模型

```
使用 Qwen/Qwen-Image 模型生成一幅山水画
```

## 可用工具

### generate_image

**描述**: 使用魔搭模型生成图片

**参数**:
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `prompt` | string | ✅ | 图片生成的文本描述，支持中英文 |
| `model` | string | ❌ | 模型ID，默认为 `"Qwen/Qwen-Image"` |
| `save_path` | string | ❌ | 保存路径，可以是目录或完整文件路径 |

**返回**:
- 生成结果的文本说明
- 生成的图片（base64编码，可直接在编辑器中显示）

## 支持的模型

- **Qwen/Qwen-Image** (默认) - FLUX 高质量图像生成
- 其他魔搭平台支持的图像生成模型（查看 [魔搭模型库](https://modelscope.cn/models)）

## 故障排除

### 常见问题

1. **服务未加载**
   - 重启 AI 编辑器
   - 检查配置文件路径是否正确
   - 确认 Node.js 版本 >= 18

2. **API 错误**
   - 验证 API 密钥有效性
   - 检查网络连接
   - 查看魔搭平台账户余额

3. **图片生成超时**
   - 图像生成通常需要 10-60 秒
   - 检查网络稳定性

### 调试模式

手动运行服务器查看日志：

```bash
MODA_API_KEY="your-key" npx moda-image-mcp
```

## 技术特性

- **MCP SDK**: 使用官方 `@modelcontextprotocol/sdk`
- **异步处理**: 支持长时间运行的图片生成任务
- **智能格式检测**: 通过文件头自动识别图片格式
- **图片处理**: 使用 sharp 库进行高质量图片处理
- **TypeScript**: 完整的类型定义支持

## 开发

```bash
# 克隆仓库
git clone https://github.com/a11995910/Moda-MCP--image.git
cd MODA_MCP

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试运行
MODA_API_KEY="your-key" npm start
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 注意事项

- ⚠️ 需要有效的魔搭 API 密钥
- ⏱️ 图像生成是异步过程，通常需要 10-60 秒
- 🔒 请妥善保管 API 密钥，不要提交到公开仓库
