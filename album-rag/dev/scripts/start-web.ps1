# 启动图像知识库 API 服务
# 访问地址: http://localhost:8003

$env:PYTHONIOENCODING = "utf-8"

Write-Host "🚀 启动图像知识库 API 服务..." -ForegroundColor Green
Write-Host "📍 服务地址: http://localhost:8003" -ForegroundColor Cyan
Write-Host "📊 API 健康检查: http://localhost:8003/health" -ForegroundColor Gray
Write-Host ""
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
Write-Host ""

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
cd $projectRoot
uv run uvicorn rag.main:app --host 0.0.0.0 --port 8003
