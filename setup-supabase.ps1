# PowerShell script to set up Supabase CLI
Write-Host "Setting up Supabase CLI..." -ForegroundColor Yellow

# Check if Docker is installed
try {
    docker --version
} catch {
    Write-Host "Docker is not installed. Please install Docker first." -ForegroundColor Red
    Write-Host "Visit: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Cyan
    exit 1
}

# Create supabase directory if it doesn't exist
if (!(Test-Path "supabase")) {
    New-Item -ItemType Directory -Path "supabase"
}

# Initialize Supabase project
Write-Host "Initializing Supabase project..." -ForegroundColor Green
docker run --rm -v "${PWD}:/work" supabase/cli:latest supabase init

Write-Host "Supabase CLI setup complete!" -ForegroundColor Green
Write-Host "You can now use: docker run --rm -v `"${PWD}:/work"` supabase/cli:latest supabase [command]" -ForegroundColor Cyan
