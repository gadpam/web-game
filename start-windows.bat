@echo off
chcp 65001 >nul
title АПТАЙМ · Ночная смена — Запуск смены
echo ===============================================================
echo   АПТАЙМ · НОЧНАЯ СМЕНА (Сервис «Партер» · Старт в 09:00)
echo ===============================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  echo [ОК] Обнаружен Node.js. Запускаем сервер партии на порту 5173...
  start "" "http://localhost:5173/#host"
  start "" "http://localhost:5173/#projector"
  call npm run dev
  goto :eof
)

if exist "dist\uptime-portable.html" (
  echo [АВТОНОМ] Открываем портативную сборку без установки (BroadcastChannel)...
  start "" "dist\uptime-portable.html#host"
  start "" "dist\uptime-portable.html#projector"
  goto :eof
)

echo [!] Сборка dist\uptime-portable.html не найдена. Выполните npm run build на машине разработчика.
pause
