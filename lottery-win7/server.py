# -*- coding: utf-8 -*-
"""
科学课堂大抽奖 - Python 备用服务器
当 PowerShell HttpListener 无法启动时自动使用此服务器
支持静态文件服务 + /api/save 保存接口
"""

import http.server
import json
import os
import sys
import webbrowser
from datetime import datetime
from urllib.parse import urlparse

PORT = 8888
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.csv': 'text/csv; charset=utf-8',
}


class LotteryHandler(http.server.BaseHTTPRequestHandler):
    """自定义请求处理器，支持静态文件和保存API"""

    def log_message(self, format, *args):
        """自定义日志格式"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        print(f"  [{timestamp}] {args[0]}")

    def send_cors_headers(self):
        """发送 CORS 头"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')

    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        """处理 POST 请求 (保存分数)"""
        parsed = urlparse(self.path)
        if parsed.path == '/api/save':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(body)

                scores = data.get('scores', {})
                time_str = datetime.now().strftime('%Y/%m/%d %H:%M:%S')

                # 统计有效记录数
                count = sum(1 for v in scores.values() if v and v > 0)

                # 生成 scores-data.js 文件内容
                scores_json = json.dumps(scores, ensure_ascii=False, separators=(',', ':'))
                content = f"const SAVED_SCORES = {scores_json};\nconst LAST_SAVED = '{time_str}';"

                # 写入文件
                file_path = os.path.join(ROOT_DIR, 'scores-data.js')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

                print(f"  \u2705 [{time_str}] 保存成功！{count} 条记录")

                # 返回成功响应
                response = json.dumps({
                    'success': True,
                    'time': time_str,
                    'count': count
                })
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                response_bytes = response.encode('utf-8')
                self.send_header('Content-Length', str(len(response_bytes)))
                self.end_headers()
                self.wfile.write(response_bytes)

            except Exception as e:
                print(f"  \u274c 保存失败: {e}")
                error_response = json.dumps({'success': False, 'error': str(e)})
                self.send_response(500)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                error_bytes = error_response.encode('utf-8')
                self.send_header('Content-Length', str(len(error_bytes)))
                self.end_headers()
                self.wfile.write(error_bytes)
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        """处理 GET 请求 (静态文件)"""
        parsed = urlparse(self.path)
        path = parsed.path

        # 默认页面
        if path == '/':
            path = '/index.html'

        # 构建文件路径（防止目录遍历）
        file_path = os.path.normpath(os.path.join(ROOT_DIR, path.lstrip('/')))
        if not file_path.startswith(ROOT_DIR):
            self.send_response(403)
            self.end_headers()
            return

        if os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')

            with open(file_path, 'rb') as f:
                data = f.read()

            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404)
            self.end_headers()


def find_available_port(start_port=8888, max_tries=10):
    """尝试找到可用端口"""
    import socket
    for i in range(max_tries):
        port = start_port + i
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    return None


def main():
    port = find_available_port(PORT)
    if port is None:
        print("\u274c 错误: 找不到可用端口！")
        print("  请关闭其他占用端口的程序后重试")
        input("\n按回车键退出...")
        sys.exit(1)

    if port != PORT:
        print(f"  \u26a0\ufe0f 端口 {PORT} 被占用，使用端口 {port}")

    try:
        server = http.server.HTTPServer(('localhost', port), LotteryHandler)
        print("")
        print("=" * 60)
        print("  \u2705 Python 服务器启动成功！")
        print("=" * 60)
        print(f"  \U0001f4cd 请在浏览器打开: http://localhost:{port}")
        print(f"  \U0001f4be 点击保存后数据将自动保存到本地文件")
        print(f"  \u26a0\ufe0f  不要关闭此窗口！")
        print("=" * 60)
        print("")

        # 自动打开浏览器
        webbrowser.open(f'http://localhost:{port}')

        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n  服务器已停止")
        server.server_close()
    except Exception as e:
        print(f"\n\u274c 启动失败: {e}")
        input("\n按回车键退出...")
        sys.exit(1)


if __name__ == '__main__':
    main()
