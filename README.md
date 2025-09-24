# 魔搭图像生成 MCP 服务

这是一个用于 Claude Code、gemini-cli、qwen code 等AI编辑器 的 MCP (Model Context Protocol) 服务器，集成了魔搭 ModelScope 的图像生成能力。

## 功能特性

- 🎨 使用魔搭平台的 FLUX 等先进图像生成模型
- 🔄 支持异步任务处理，自动轮询生成状态
- 💾 自动保存图片到用户的“下载”文件夹，并支持自定义路径
- 🖼️ 在 Claude Code、gemini-cli、qwen code 等AI编辑器中直接显示生成的图片
- 🔍 智能检测图片格式 (PNG/JPEG/GIF/WebP)
- ⏰ 带时间戳的文件命名，避免覆盖

## 安装

1. 克隆仓库:
```bash
git clone https://github.com/your-username/MODA_MCP.git
cd MODA_MCP
```

2. 安装依赖:
```bash
pip3 install requests Pillow mcp
```

## 配置

请根据你使用的AI编辑器选择对应的配置方法。

### For Gemini CLI

`gemini-cli` 使用一个位于 `~/.gemini/settings.json` 的全局配置文件。

1.  打开或创建该文件。
2.  在 `mcpServers` 对象中添加以下内容。如果 `mcpServers` 不存在，请先创建它。

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "/usr/bin/python3",
      "args": [
        "-m",
        "moda_image_mcp.server"
      ],
      "env": {
        "MODA_API_KEY": "请替换为你的魔搭API密钥",
        "PYTHONPATH": "/Users/wangjun/work/Moda-MCP--image"
      },
      "transport": "stdio"
    }
  }
}
```
**注意**:
- 请将 `/Users/wangjun/work/Moda-MCP--image` 替换为你本地项目的 **绝对路径**。此路径取决于你将项目克隆到本地的位置，因此需要手动设置。
- `command` 应使用 `python3` 的完整路径 (可以通过 `which python3` 命令查找)。

### For Other Editors (e.g., Claude Code)

一些编辑器可能支持在项目根目录创建 `.mcp.json` 文件进行配置。原始文档提供了以下方法：

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "/usr/bin/python3",
      "args": ["-m", "moda_image_mcp.server"],
      "env": {
        "MODA_API_KEY": "请替换为你的魔搭API密钥",
        "PYTHONPATH": "/path/to/your/MODA_MCP"
      }
    }
  }
}
```

**注意**：
- 此方法的有效性取决于你所使用的编辑器是否支持。
- 你需要将 `PYTHONPATH` 的值 `/path/to/your/MODA_MCP` 修改为你本地项目的 **绝对路径**。此路径取决于你将项目克隆到本地的位置，因此需要手动设置。

### 验证安装

重启你的AI编辑器后，运行验证命令（通常是 `/mcp`）检查 `moda-image` 服务是否已成功加载。

## 使用方法

配置完成后，你可以在 Claude Code、gemini-cli、qwen code 等AI编辑器中直接使用以下命令生成图片：

### 基础使用
```
生成一张金色小猫的图片
```
图片将保存到默认的“下载”文件夹。

### 指定保存路径
```
生成一张蓝色汽车的图片，并将其保存到 /Users/wangjun/Desktop/my_car.jpg
```

### 指定模型
```
使用 Qwen/Qwen-Image 模型生成一幅山水画
```

## 可用工具

### generate_image

**描述**: 使用魔搭模型生成图片

**参数**:
- `prompt` (必需): 图片生成的文本描述
- `model` (可选): 模型ID，默认为 `"Qwen/Qwen-Image"`
- `save_path` (可选): 保存图片的路径（可以是目录或完整文件路径）。如果未提供，则默认保存到用户的“下载”文件夹。

**功能**:
- 🖼️ 在 Claude Code、gemini-cli、qwen code 等AI编辑器界面显示生成的图片
- 💾 自动保存图片到指定路径或默认的“下载”文件夹
- 📝 返回保存路径信息

## 输出目录结构

默认情况下，生成的图片会保存到系统的“下载”文件夹。如果指定了 `save_path`，则会保存到相应位置。

## 支持的模型

- **Qwen/Qwen-Image** (默认) - FLUX 高质量图像生成
- 其他魔搭平台支持的图像生成模型（需在魔搭平台查看可用模型）

## 故障排除

### 常见问题

1. **`/mcp` 显示没有服务**
   - 检查 `.mcp.json` 文件是否在项目根目录
   - 确认 Python 路径正确 (`which python3`)
   - 重启 Claude Code、gemini-cli、qwen code 等AI编辑器

2. **"模块找不到"错误**
   - 确认已安装依赖：`pip3 install requests Pillow mcp`
   - 检查 `PYTHONPATH` 设置正确

3. **API 错误**
   - 验证 API 密钥有效性
   - 检查网络连接

4. **图片 MIME 类型错误**
   - 已自动修复：服务会智能检测图片格式

### 测试服务器

```bash
# 独立测试 MCP 服务器
MODA_API_KEY="your-key" python3 -m moda_image_mcp.server
```

## 技术特性

- **异步处理**: 使用 asyncio 进行异步图片生成
- **智能格式检测**: 通过文件头自动识别图片格式
- **错误处理**: 完善的异常处理和日志记录
- **PIL 集成**: 使用 Pillow 库进行图片处理和保存
- **MCP 协议兼容**: 完全兼容 Claude Code、gemini-cli、qwen code 等AI编辑器的 MCP 标准

## 注意事项

- ⚠️ 需要有效的魔搭 API 密钥
- ⏱️ 图像生成是异步过程，通常需要 10-60 秒
- 🔒 API 密钥会在配置文件中明文存储，注意安全性