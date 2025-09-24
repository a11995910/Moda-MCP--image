# 魔搭图像生成 MCP 服务

这是一个用于 Claude Code 的 MCP (Model Context Protocol) 服务器，集成了魔搭 ModelScope 的图像生成能力。

## 功能特性

- 🎨 使用魔搭平台的 FLUX 等先进图像生成模型
- 🔄 支持异步任务处理，自动轮询生成状态
- 💾 自动保存图片到本地 `images/` 目录
- 🖼️ 在 Claude Code 中直接显示生成的图片
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

### 项目级别配置（推荐）

在项目根目录创建 `.mcp.json` 文件：

```json
{
  "mcpServers": {
    "moda-image": {
      "command": "/usr/bin/python3",
      "args": ["-m", "moda_image_mcp.server"],
      "env": {
        "MODA_API_KEY": "ms-1b4dbf16-8d02-4fca-9228-599c2eec42ae",
        "PYTHONPATH": "/path/to/your/MODA_MCP"
      }
    }
  }
}
```

**注意**：
- 使用 `python3` 的完整路径（可用 `which python3` 查看）
- 更新 `PYTHONPATH` 为你的项目路径
- 配置文件会自动被 Claude Code 检测

### 验证安装

重启 Claude Code 后，运行以下命令验证：
```
/mcp
```
应该显示 `moda-image` 服务已加载。

## 使用方法

配置完成后，你可以在 Claude Code 中直接使用以下命令生成图片：

### 基础使用
```
生成一张金色小猫的图片
```

### 复杂提示词
```
生成一个美丽的女性在金色沙滩上优雅地走着，海浪轻柔地拍打着岸边，夕阳西下，天空呈现出温暖的橙红色调，她穿着白色的飘逸连衣裙，长发随海风轻舞，画面唯美浪漫
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

**功能**:
- 🖼️ 在 Claude Code 界面显示生成的图片
- 💾 自动保存图片到 `images/generated_YYYYMMDD_HHMMSS.jpg`
- 📝 返回保存路径信息

## 输出目录结构

生成的图片会保存到项目目录下：
```
MODA_MCP/
├── images/
│   ├── generated_20241225_143022.jpg
│   ├── generated_20241225_143055.jpg
│   └── ...
├── moda_image_mcp/
├── .mcp.json
└── README.md
```

## 支持的模型

- **Qwen/Qwen-Image** (默认) - FLUX 高质量图像生成
- 其他魔搭平台支持的图像生成模型（需在魔搭平台查看可用模型）

## 故障排除

### 常见问题

1. **`/mcp` 显示没有服务**
   - 检查 `.mcp.json` 文件是否在项目根目录
   - 确认 Python 路径正确 (`which python3`)
   - 重启 Claude Code

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
- **MCP 协议兼容**: 完全兼容 Claude Code 的 MCP 标准

## 注意事项

- ⚠️ 需要有效的魔搭 API 密钥
- ⏱️ 图像生成是异步过程，通常需要 10-60 秒
- 🔒 API 密钥会在配置文件中明文存储，注意安全性
- 💾 生成的图片会占用磁盘空间，定期清理 `images/` 目录