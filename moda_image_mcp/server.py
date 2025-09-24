#!/usr/bin/env python3

import asyncio
import logging
import os
import json
import time
import base64
from typing import Any, Sequence
from urllib.parse import urljoin
import requests
from PIL import Image
from io import BytesIO
from datetime import datetime

from mcp.server import Server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)
import mcp.types as types

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("moda-image-mcp")

class ModaImageGenerator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api-inference.modelscope.cn/'
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def generate_image(self, prompt: str, model: str = "Qwen/Qwen-Image") -> tuple[str, str, str]:
        """生成图片并返回base64编码的图片数据、MIME类型和文件路径"""
        
        # 创建任务
        response = requests.post(
            f"{self.base_url}v1/images/generations",
            headers={**self.headers, "X-ModelScope-Async-Mode": "true"},
            data=json.dumps({
                "model": model,
                "prompt": prompt
            }, ensure_ascii=False).encode('utf-8')
        )
        
        response.raise_for_status()
        task_id = response.json()["task_id"]
        
        logger.info(f"创建图片生成任务: {task_id}")
        
        # 轮询任务状态
        while True:
            result = requests.get(
                f"{self.base_url}v1/tasks/{task_id}",
                headers={**self.headers, "X-ModelScope-Task-Type": "image_generation"},
            )
            result.raise_for_status()
            data = result.json()
            
            logger.info(f"任务状态: {data['task_status']}")
            
            if data["task_status"] == "SUCCEED":
                # 下载图片
                image_response = requests.get(data["output_images"][0])
                image_response.raise_for_status()
                
                # 使用PIL打开和处理图片（就像example.py那样）
                image = Image.open(BytesIO(image_response.content))
                
                # 创建images目录
                os.makedirs("images", exist_ok=True)
                
                # 生成带时间戳的文件名
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"images/generated_{timestamp}.jpg"
                
                # 保存图片到本地文件
                image.save(filename, "JPEG", quality=95)
                logger.info(f"图片已保存到: {filename}")
                
                # 检测图片格式
                image_bytes = image_response.content
                mime_type = "image/jpeg"  # 默认值
                
                # 通过文件头检测格式
                if image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
                    mime_type = "image/png"
                elif image_bytes.startswith(b'\xff\xd8\xff'):
                    mime_type = "image/jpeg"
                elif image_bytes.startswith(b'GIF8'):
                    mime_type = "image/gif"
                elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
                    mime_type = "image/webp"
                
                # 转换为base64
                image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                return image_base64, mime_type, filename
                
            elif data["task_status"] == "FAILED":
                raise Exception(f"图片生成失败: {data.get('message', '未知错误')}")
            
            await asyncio.sleep(3)

# 初始化服务器
server = Server("moda-image-mcp")

# 全局图片生成器实例
image_generator = None

@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """列出可用的工具"""
    return [
        Tool(
            name="generate_image",
            description="使用魔搭模型生成图片",
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "图片生成的文本描述"
                    },
                    "model": {
                        "type": "string", 
                        "description": "使用的模型ID",
                        "default": "Qwen/Qwen-Image"
                    }
                },
                "required": ["prompt"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict | None) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """处理工具调用"""
    global image_generator
    
    if not image_generator:
        raise ValueError("API密钥未配置。请设置MODA_API_KEY环境变量")
    
    if name == "generate_image":
        if not arguments:
            raise ValueError("缺少参数")
        
        prompt = arguments.get("prompt")
        model = arguments.get("model", "Qwen/Qwen-Image")
        
        if not prompt:
            raise ValueError("prompt参数是必需的")
        
        try:
            logger.info(f"开始生成图片: {prompt}")
            image_base64, mime_type, filename = await image_generator.generate_image(prompt, model)
            
            return [
                types.TextContent(
                    type="text",
                    text=f"成功生成图片 - 提示词: {prompt}\n图片已保存到: {filename}"
                ),
                types.ImageContent(
                    type="image",
                    data=image_base64,
                    mimeType=mime_type
                )
            ]
            
        except Exception as e:
            logger.error(f"生成图片时出错: {e}")
            return [
                types.TextContent(
                    type="text",
                    text=f"生成图片失败: {str(e)}"
                )
            ]
    else:
        raise ValueError(f"未知工具: {name}")

async def main():
    """主函数"""
    global image_generator
    
    # 从环境变量获取API密钥
    api_key = os.getenv("MODA_API_KEY")
    if not api_key:
        logger.error("未找到MODA_API_KEY环境变量")
        logger.info("请设置环境变量: export MODA_API_KEY='your-api-key'")
        return
    
    image_generator = ModaImageGenerator(api_key)
    
    # 运行服务器
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())