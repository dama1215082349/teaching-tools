# Science Classroom Lottery - PS2.0 Compatible Server (Windows 7+)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$startPort = 8888

$mimeTypes = @{}
$mimeTypes['.html'] = 'text/html; charset=utf-8'
$mimeTypes['.htm'] = 'text/html; charset=utf-8'
$mimeTypes['.css'] = 'text/css; charset=utf-8'
$mimeTypes['.js'] = 'application/javascript; charset=utf-8'
$mimeTypes['.json'] = 'application/json; charset=utf-8'
$mimeTypes['.png'] = 'image/png'
$mimeTypes['.jpg'] = 'image/jpeg'
$mimeTypes['.jpeg'] = 'image/jpeg'
$mimeTypes['.gif'] = 'image/gif'
$mimeTypes['.svg'] = 'image/svg+xml'
$mimeTypes['.ico'] = 'image/x-icon'
$mimeTypes['.csv'] = 'text/csv; charset=utf-8'
$mimeTypes['.woff'] = 'font/woff'
$mimeTypes['.woff2'] = 'font/woff2'
$mimeTypes['.ttf'] = 'font/ttf'

# Try ports until one works
$port = $startPort
$listener = $null
$started = $false

for ($i = 0; $i -lt 10; $i++) {
    $testPort = $startPort + $i
    $testListener = New-Object System.Net.HttpListener
    $testPrefix = 'http://localhost:' + $testPort + '/'
    $testListener.Prefixes.Add($testPrefix)
    try {
        $testListener.Start()
        $port = $testPort
        $listener = $testListener
        $started = $true
        break
    } catch {
        try { $testListener.Close() } catch {}
    }
}

if (-not $started) {
    Write-Host '  [ERROR] No available port!' -ForegroundColor Red
    exit 1
}

if ($port -ne $startPort) {
    Write-Host ('  [WARN] Port ' + $startPort + ' busy, using ' + $port) -ForegroundColor Yellow
}

Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '  [OK] Server started!' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ('  URL: http://localhost:' + $port) -ForegroundColor Yellow
Write-Host '  DO NOT close this window!' -ForegroundColor Red
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''

try { Start-Process ('http://localhost:' + $port) } catch {}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $res.Headers.Add('Access-Control-Allow-Origin', '*')
        $res.Headers.Add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        $res.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
        $res.Headers.Add('Cache-Control', 'no-store, no-cache, must-revalidate')

        $urlPath = $req.Url.LocalPath

        if ($req.HttpMethod -eq 'OPTIONS') {
            $res.StatusCode = 200
            $res.Close()
            continue
        }

        # POST /api/save
        if ($req.HttpMethod -eq 'POST' -and $urlPath -eq '/api/save') {
            try {
                $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $timeStr = Get-Date -Format 'yyyy/MM/dd HH:mm:ss'

                # Extract scores JSON from {"scores":{...}}
                $scoresJson = '{}'
                $count = 0
                $marker = '"scores"'
                $markerPos = $body.IndexOf($marker)

                if ($markerPos -ge 0) {
                    $searchStart = $markerPos + $marker.Length
                    $braceStart = $body.IndexOf('{', $searchStart)

                    if ($braceStart -ge 0) {
                        $depth = 0
                        $braceEnd = $braceStart
                        for ($ci = $braceStart; $ci -lt $body.Length; $ci++) {
                            $ch = $body.Substring($ci, 1)
                            if ($ch -eq '{') { $depth++ }
                            elseif ($ch -eq '}') {
                                $depth--
                                if ($depth -eq 0) { $braceEnd = $ci; break }
                            }
                        }
                        $scoresJson = $body.Substring($braceStart, $braceEnd - $braceStart + 1)
                    }
                }

                # Count non-zero scores
                $scoreHits = [regex]::Matches($scoresJson, ':(\d+)')
                foreach ($hit in $scoreHits) {
                    if ([int]$hit.Groups[1].Value -gt 0) { $count++ }
                }

                # Write scores-data.js
                $jsContent = 'const SAVED_SCORES = ' + $scoresJson + ';' + "`n" + "const LAST_SAVED = '" + $timeStr + "';"
                $savePath = Join-Path $root 'scores-data.js'
                [System.IO.File]::WriteAllText($savePath, $jsContent, [System.Text.Encoding]::UTF8)

                Write-Host ('  [' + $timeStr + '] Saved! ' + $count + ' records') -ForegroundColor Green

                $respJson = '{"success":true,"time":"' + $timeStr + '","count":' + $count + '}'
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $res.ContentType = 'application/json'
                $res.ContentLength64 = $respBytes.Length
                $res.OutputStream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                Write-Host ('  [ERROR] ' + $_.Exception.Message) -ForegroundColor Red
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":false}')
                $res.StatusCode = 500
                $res.ContentType = 'application/json'
                $res.ContentLength64 = $errBytes.Length
                $res.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $res.Close()
            continue
        }

        # GET - static files
        if ($urlPath -eq '/') { $urlPath = '/index.html' }

        $cleanPath = $urlPath.TrimStart('/').Replace('..', '')
        $filePath = Join-Path $root $cleanPath

        if (Test-Path $filePath) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = 'application/octet-stream'
            if ($mimeTypes.ContainsKey($ext)) { $contentType = $mimeTypes[$ext] }

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = $contentType
            $res.ContentLength64 = $fileBytes.Length
            $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $res.StatusCode = 404
            $nfBytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $res.ContentLength64 = $nfBytes.Length
            $res.OutputStream.Write($nfBytes, 0, $nfBytes.Length)
        }

        $res.Close()
    }
} catch {
    Write-Host ('  Server error: ' + $_.Exception.Message) -ForegroundColor Red
} finally {
    if ($listener -ne $null) {
        try { $listener.Stop(); $listener.Close() } catch {}
    }
    Write-Host '  Server stopped.' -ForegroundColor Yellow
}
