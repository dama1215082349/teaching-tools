# 科学课堂大抽奖 - 本地服务器 (PowerShell版)
# 双击运行此文件启动服务器

$port = 8888
$root = $PSScriptRoot

# 创建 HTTP 监听器
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "║   🎰  科学课堂大抽奖 - 本地服务器已启动！                  ║" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "║   📍 请在浏览器打开: http://localhost:8888                 ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "║   💾 点击保存后数据将自动保存到本地文件                    ║" -ForegroundColor Yellow
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "║   ⚠️  按 Ctrl+C 停止服务器                                 ║" -ForegroundColor Cyan
    Write-Host "║                                                            ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # 自动打开浏览器（优先 Chrome，其次 Edge，最后默认浏览器）
    $chromePathUser = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    $chromePath2 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    $edgePath2 = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    
    if (Test-Path $chromePathUser) {
        Write-Host "🌐 使用 Google Chrome 打开..." -ForegroundColor Cyan
        Start-Process $chromePathUser "http://localhost:$port"
    }
    elseif (Test-Path $chromePath) {
        Write-Host "🌐 使用 Google Chrome 打开..." -ForegroundColor Cyan
        Start-Process $chromePath "http://localhost:$port"
    }
    elseif (Test-Path $chromePath2) {
        Write-Host "🌐 使用 Google Chrome 打开..." -ForegroundColor Cyan
        Start-Process $chromePath2 "http://localhost:$port"
    }
    elseif (Test-Path $edgePath) {
        Write-Host "🌐 使用 Microsoft Edge 打开..." -ForegroundColor Cyan
        Start-Process $edgePath "http://localhost:$port"
    }
    elseif (Test-Path $edgePath2) {
        Write-Host "🌐 使用 Microsoft Edge 打开..." -ForegroundColor Cyan
        Start-Process $edgePath2 "http://localhost:$port"
    }
    else {
        Write-Host "🌐 使用默认浏览器打开..." -ForegroundColor Cyan
        Start-Process "http://localhost:$port"
    }
    
    # MIME 类型映射
    $mimeTypes = @{
        ".html" = "text/html; charset=utf-8"
        ".css"  = "text/css; charset=utf-8"
        ".js"   = "application/javascript; charset=utf-8"
        ".json" = "application/json; charset=utf-8"
        ".png"  = "image/png"
        ".jpg"  = "image/jpeg"
        ".gif"  = "image/gif"
        ".svg"  = "image/svg+xml"
        ".ico"  = "image/x-icon"
    }
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # CORS 头
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        
        $url = $request.Url.LocalPath
        
        # OPTIONS 请求
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }
        
        # POST /api/save - 保存数据
        if ($request.HttpMethod -eq "POST" -and $url -eq "/api/save") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream)
                $body = $reader.ReadToEnd()
                $reader.Close()
                
                $data = $body | ConvertFrom-Json
                $timeStr = Get-Date -Format "yyyy/MM/dd HH:mm:ss"
                $scores = $data.scores
                $scoresJson = $scores | ConvertTo-Json -Depth 10
                
                # 计算非零积分数量
                $nonZeroCount = 0
                $scores.PSObject.Properties | ForEach-Object {
                    if ($_.Value -gt 0) { $nonZeroCount++ }
                }
                
                # 生成文件内容
                $fileContent = @"
/**
 * 积分数据文件 - Science Classroom Lottery
 * 此文件由系统自动生成
 * 最后更新: $timeStr
 * 有效积分记录: $nonZeroCount 条
 */

// 积分数据 (班级_姓名: 积分)
const SAVED_SCORES = $scoresJson;

// 最后保存时间
const LAST_SAVED = "$timeStr";
"@
                
                # 写入文件
                $filePath = Join-Path $root "scores-data.js"
                [System.IO.File]::WriteAllText($filePath, $fileContent, [System.Text.Encoding]::UTF8)
                
                Write-Host "✅ [$timeStr] 保存成功！$nonZeroCount 条积分记录" -ForegroundColor Green
                
                $responseJson = @{ success = $true; time = $timeStr; count = $nonZeroCount } | ConvertTo-Json
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseJson)
                $response.ContentType = "application/json"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            catch {
                Write-Host "❌ 保存失败: $_" -ForegroundColor Red
                $response.StatusCode = 500
                $responseJson = @{ success = $false; error = $_.ToString() } | ConvertTo-Json
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseJson)
                $response.ContentType = "application/json"
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            $response.Close()
            continue
        }
        
        # 静态文件服务
        if ($url -eq "/") { $url = "/index.html" }
        $filePath = Join-Path $root $url.TrimStart("/")
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = $mimeTypes[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        else {
            $response.StatusCode = 404
            $msg = "File not found: $url"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    }
}
catch {
    Write-Host "❌ 服务器错误: $_" -ForegroundColor Red
}
finally {
    $listener.Stop()
}

Read-Host "按 Enter 键退出"
