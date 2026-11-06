@echo off
setlocal
set "APP_DIR=%~dp0"
set "NODE_EXE=C:\Users\eruiz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  where node >nul 2>&1
  if errorlevel 1 (
    echo No encontre Node.js. Instala Node.js o inicia el prototipo con otro servidor local.
    pause
    exit /b 1
  )
  set "NODE_EXE=node"
)
powershell -NoProfile -Command "Start-Process -FilePath '%NODE_EXE%' -ArgumentList 'server.mjs' -WorkingDirectory '%APP_DIR%' -WindowStyle Hidden"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"
endlocal
