# Starts the backend, the public website and the admin site, each in its own window.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\backend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\frontend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\frontend'; npm run dev:admin"