/**
 * 本地服务器 - Science Classroom Lottery
 * 双击 start-server.bat 启动
 * 支持自动保存积分数据到本地文件
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'scores-data.js');

// MIME types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API: Save scores
    if (req.method === 'POST' && req.url === '/api/save') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const timeStr = new Date().toLocaleString('zh-CN');
                const nonZeroCount = Object.values(data.scores).filter(s => s > 0).length;

                const fileContent = `/**
 * 积分数据文件 - Science Classroom Lottery
 * 此文件由系统自动生成
 * 最后更新: ${timeStr}
 * 有效积分记录: ${nonZeroCount} 条
 */

// 积分数据 (班级_姓名: 积分)
const SAVED_SCORES = ${JSON.stringify(data.scores, null, 4)};

// 最后保存时间
const LAST_SAVED = "${timeStr}";
`;

                fs.writeFileSync(DATA_FILE, fileContent, 'utf8');

                console.log(`✅ [${timeStr}] 保存成功！${nonZeroCount} 条积分记录`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, time: timeStr, count: nonZeroCount }));
            } catch (err) {
                console.error('❌ 保存失败:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // API: Load scores
    if (req.method === 'GET' && req.url === '/api/load') {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const content = fs.readFileSync(DATA_FILE, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(content);
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ scores: {}, lastSaved: null }));
            }
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found: ' + req.url);
            } else {
                res.writeHead(500);
                res.end('Server error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   🎰  科学课堂大抽奖 - 本地服务器已启动！                  ║');
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                                                            ║');
    console.log(`║   📍 请在浏览器打开: http://localhost:${PORT}                 ║`);
    console.log('║                                                            ║');
    console.log('║   💾 积分数据将自动保存到本地文件                          ║');
    console.log('║                                                            ║');
    console.log('║   ⚠️  关闭此窗口将停止服务器                               ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ 端口 ${PORT} 已被占用，请关闭其他程序后重试`);
    } else {
        console.error('❌ 服务器错误:', err.message);
    }
    process.exit(1);
});
