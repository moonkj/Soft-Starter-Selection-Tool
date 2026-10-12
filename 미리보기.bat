@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run build
start "" http://localhost:4173
call npx vite preview --port 4173
