#!/usr/bin/env node

/**
 * 魔搭图像生成 MCP 服务器
 * 
 * 功能：集成魔搭 ModelScope 的图像生成能力
 * 支持：Claude Code、Gemini CLI、Qwen Code 等 AI 编辑器
 * 
 * 环境变量：
 * - MODA_API_KEY: 魔搭平台的 API 密钥（必需）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
  ImageContent,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import sharp from 'sharp';

// ============================================
// 类型定义
// ============================================

/**
 * 图像生成任务响应
 */
interface TaskResponse {
  task_id: string;
}

/**
 * 任务状态响应
 */
interface TaskStatusResponse {
  task_status: 'PENDING' | 'RUNNING' | 'SUCCEED' | 'FAILED';
  output_images?: string[];
  message?: string;
}

/**
 * generate_image 工具参数
 */
interface GenerateImageArgs {
  prompt: string;           // 图片生成的文本描述
  model?: string;           // 使用的模型ID
  save_path?: string;       // 保存图片的路径
}

// ============================================
// 图像生成器类
// ============================================

/**
 * 魔搭图像生成器
 * 负责与魔搭 ModelScope API 交互
 */
class ModaImageGenerator {
  private apiKey: string;
  private baseUrl: string = 'https://api-inference.modelscope.cn/';
  private headers: Record<string, string>;

  /**
   * 构造函数
   * @param apiKey - 魔搭平台的 API 密钥
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 生成图片
   * @param prompt - 图片描述提示词
   * @param model - 模型ID，默认为 "Qwen/Qwen-Image"
   * @param savePath - 保存路径（可选）
   * @returns 返回 base64 编码的图片数据、MIME 类型和文件路径
   */
  async generateImage(
    prompt: string, 
    model: string = 'Qwen/Qwen-Image', 
    savePath?: string
  ): Promise<{ base64: string; mimeType: string; filePath: string }> {
    
    // 创建异步生成任务
    console.error(`[moda-image-mcp] 创建图片生成任务: ${prompt}`);
    
    const createResponse = await axios.post<TaskResponse>(
      `${this.baseUrl}v1/images/generations`,
      {
        model: model,
        prompt: prompt,
      },
      {
        headers: {
          ...this.headers,
          'X-ModelScope-Async-Mode': 'true',
        },
      }
    );

    const taskId = createResponse.data.task_id;
    console.error(`[moda-image-mcp] 任务ID: ${taskId}`);

    // 轮询任务状态
    while (true) {
      const statusResponse = await axios.get<TaskStatusResponse>(
        `${this.baseUrl}v1/tasks/${taskId}`,
        {
          headers: {
            ...this.headers,
            'X-ModelScope-Task-Type': 'image_generation',
          },
        }
      );

      const data = statusResponse.data;
      console.error(`[moda-image-mcp] 任务状态: ${data.task_status}`);

      if (data.task_status === 'SUCCEED') {
        if (!data.output_images || data.output_images.length === 0) {
          throw new Error('图片生成成功但未返回图片URL');
        }

        // 下载图片
        const imageUrl = data.output_images[0];
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });

        const imageBuffer = Buffer.from(imageResponse.data);

        // 检测图片格式
        const mimeType = this.detectMimeType(imageBuffer);

        // 处理保存路径
        const filePath = await this.saveImage(imageBuffer, savePath);
        console.error(`[moda-image-mcp] 图片已保存到: ${filePath}`);

        // 转换为base64
        const base64 = imageBuffer.toString('base64');

        return { base64, mimeType, filePath };

      } else if (data.task_status === 'FAILED') {
        throw new Error(`图片生成失败: ${data.message || '未知错误'}`);
      }

      // 等待3秒后继续轮询
      await this.sleep(3000);
    }
  }

  /**
   * 检测图片MIME类型
   * @param buffer - 图片二进制数据
   * @returns MIME类型字符串
   */
  private detectMimeType(buffer: Buffer): string {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'image/webp';
    }
    // 默认返回 JPEG
    return 'image/jpeg';
  }

  /**
   * 保存图片到本地
   * @param buffer - 图片二进制数据
   * @param savePath - 保存路径（可选）
   * @returns 实际保存的文件路径
   */
  private async saveImage(buffer: Buffer, savePath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let filePath: string;

    if (savePath) {
      // 检查是否为目录
      try {
        const stats = fs.statSync(savePath);
        if (stats.isDirectory()) {
          filePath = path.join(savePath, `generated_${timestamp}.jpg`);
        } else {
          filePath = savePath;
        }
      } catch {
        // 路径不存在，作为文件路径使用
        filePath = savePath;
      }
    } else {
      // 默认保存到下载文件夹
      const downloadFolder = path.join(os.homedir(), 'Downloads');
      if (!fs.existsSync(downloadFolder)) {
        fs.mkdirSync(downloadFolder, { recursive: true });
      }
      filePath = path.join(downloadFolder, `generated_${timestamp}.jpg`);
    }

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 使用 sharp 处理并保存图片
    await sharp(buffer)
      .jpeg({ quality: 95 })
      .toFile(filePath);

    return filePath;
  }

  /**
   * 睡眠函数
   * @param ms - 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// MCP 服务器
// ============================================

/**
 * 定义可用的工具列表
 */
const TOOLS: Tool[] = [
  {
    name: 'generate_image',
    description: '使用魔搭模型生成图片。支持多种图像生成模型，生成的图片会自动保存到本地。',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '图片生成的文本描述，支持中英文',
        },
        model: {
          type: 'string',
          description: '使用的模型ID，默认为 "Qwen/Qwen-Image"',
          default: 'Qwen/Qwen-Image',
        },
        save_path: {
          type: 'string',
          description: '保存图片的路径（可选），可以是目录或完整文件路径。如果不指定，默认保存到用户下载文件夹。',
        },
      },
      required: ['prompt'],
    },
  },
];

/**
 * 主函数 - 启动 MCP 服务器
 */
async function main(): Promise<void> {
  // 获取 API 密钥
  const apiKey = process.env.MODA_API_KEY;
  if (!apiKey) {
    console.error('[moda-image-mcp] 错误: 未找到 MODA_API_KEY 环境变量');
    console.error('[moda-image-mcp] 请设置环境变量: export MODA_API_KEY="your-api-key"');
    process.exit(1);
  }

  // 创建图像生成器实例
  const imageGenerator = new ModaImageGenerator(apiKey);

  // 创建 MCP 服务器
  const server = new Server(
    {
      name: 'moda-image-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 处理列出工具请求
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // 处理调用工具请求
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'generate_image') {
      const typedArgs = args as unknown as GenerateImageArgs;
      const { prompt, model, save_path } = typedArgs;

      if (!prompt) {
        throw new Error('prompt 参数是必需的');
      }

      try {
        console.error(`[moda-image-mcp] 开始生成图片: ${prompt}`);
        
        const result = await imageGenerator.generateImage(
          prompt,
          model || 'Qwen/Qwen-Image',
          save_path
        );

        // 返回文本和图片内容
        const content: (TextContent | ImageContent)[] = [
          {
            type: 'text',
            text: `成功生成图片 - 提示词: ${prompt}\n图片已保存到: ${result.filePath}`,
          },
          {
            type: 'image',
            data: result.base64,
            mimeType: result.mimeType,
          },
        ];

        return { content };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[moda-image-mcp] 生成图片时出错: ${errorMessage}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `生成图片失败: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`未知工具: ${name}`);
  });

  // 启动 stdio 传输
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[moda-image-mcp] 服务器已启动');
}

// 运行主函数
main().catch((error) => {
  console.error('[moda-image-mcp] 启动失败:', error);
  process.exit(1);
});
