@echo off
chcp 65001 >nul
title 科学吴老师课堂互动百宝箱 - 一键启动

echo.
echo ══════════════════════════════════════════════════════════════
echo   🌟 科学吴老师课堂互动百宝箱 - 一键启动 🌟
echo ══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo   请选择要启动的模式：
echo.
echo   [1] Win10 模式（启动 Win10 抽奖服务器 + 打开导航页）
echo   [2] Win7  模式（启动 Win7  抽奖服务器 + 打开导航页）
echo   [3] 仅打开导航页（不启动任何服务器）
echo.

set /p choice=  请输入选项 (1/2/3): 

if "%choice%"=="1" goto win10
if "%choice%"=="2" goto win7
if "%choice%"=="3" goto navonly
goto navonly

:win10
echo.
echo   🚀 正在启动 Win10 抽奖服务器...
start "抽奖服务器-Win10" cmd /c "cd /d "%~dp0抽奖win10" && 启动服务器.bat"
echo   ✅ Win10 抽奖服务器已在后台启动
echo.
timeout /t 2 /nobreak >nul
goto opennav

:win7
echo.
echo   🚀 正在启动 Win7 抽奖服务器...
start "抽奖服务器-Win7" cmd /c "cd /d "%~dp0抽奖win7" && 启动服务器.bat"
echo   ✅ Win7 抽奖服务器已在后台启动
echo.
timeout /t 2 /nobreak >nul
goto opennav

:navonly
echo.
echo   📋 仅打开导航页面...
echo.

:opennav
echo   🌐 正在打开导航页面...
start "" "%~dp0index.html"
echo   ✅ 导航页面已打开
echo.

echo ══════════════════════════════════════════════════════════════
echo   ✨ 启动完成！可以开始上课了 ✨
echo.
echo   💡 提示：
echo      - 抽奖功能需要服务器运行才能保存数据
echo      - 成绩对比和鸭子赛跑可以直接使用
echo      - 关闭此窗口不影响已打开的页面
echo      - 但请不要关闭服务器窗口！
echo ══════════════════════════════════════════════════════════════
echo.
pause
