#Requires -RunAsAdministrator
<#
.SYNOPSIS
Installation script for Godspeed RAG MCP server and required dependencies.
#>

Write-Host "Starting Godspeed RAG MCP Installation..." -ForegroundColor Cyan

#region Admin Check
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script must be run as Administrator. Please right-click and 'Run as Administrator'." -ForegroundColor Red
    exit
}
#endregion

#region Node.js and NVM Setup
Write-Host "`nChecking Node.js installation..." -ForegroundColor Cyan

# Improved NVM detection
$nvmInstalled = $false
try {
    $nvmVersion = cmd /c nvm version 2>&1
    if (-not ($nvmVersion -match "not recognized")) {
        $nvmInstalled = $true
        $nvmPath = (Get-ItemProperty "HKCU:\Environment").NVM_HOME
    }
} catch { }

# Check existing Node installation
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

if ($nodeInstalled) {
    Write-Host "Node.js detected. Checking installation source..."
    
    if (-not $nvmInstalled) {
        Write-Host "NVM not detected. Checking for winget installation..."
        $wingetNode = winget list --id OpenJS.NodeJS | Select-String -Pattern 'OpenJS.NodeJS'
        
        if ($wingetNode) {
            Write-Host "Removing winget-installed Node.js..."
            winget uninstall -e --id OpenJS.NodeJS
        }
        else {
            Write-Host "Non-NVM Node.js installation detected. Please remove manually and restart the script." -ForegroundColor Red
            exit
        }
    }
}

# Install/Update NVM
if (-not $nvmInstalled) {
    Write-Host "Installing NVM for Windows..." -ForegroundColor Cyan
    winget install -e --id CoreyButler.NVMforWindows
    
    # Force refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Set NVM_HOME if not present
    $nvmHome = [Environment]::GetEnvironmentVariable("NVM_HOME", "User")
    if (-not $nvmHome) {
        $nvmDir = "${env:ProgramFiles}\NVM for Windows"
        [Environment]::SetEnvironmentVariable("NVM_HOME", $nvmDir, "User")
        $env:NVM_HOME = $nvmDir
    }
    
    # Wait for environment to update
    Write-Host "Waiting for environment to update..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Verify NVM is now available
    try {
        $nvmCheck = cmd /c nvm version 2>&1
        if ($nvmCheck -match "not recognized") {
            throw "NVM still not recognized"
        }
        $nvmInstalled = $true
    } catch {
        Write-Host "NVM installation verification failed. Please restart your shell and run the script again." -ForegroundColor Red
        exit
    }
}

# Install Node.js via NVM
Write-Host "Installing Node.js LTS via NVM..." -ForegroundColor Cyan
cmd /c "nvm install lts"
cmd /c "nvm use lts"

# Force refresh PATH after NVM changes
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verify Node and npm are available
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "Node.js version: $nodeVersion"
    Write-Host "npm version: $npmVersion"
} catch {
    Write-Host "Node/npm commands not available. Trying to refresh environment..." -ForegroundColor Yellow
    
    # Additional environment refresh attempts
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path += ";$env:NVM_HOME"
    
    # Final verification
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "Node/npm still not available. Please restart your shell and run the script again." -ForegroundColor Red
        exit
    }
}


#region RAG Node Installation and .env Setup
Write-Host "Installing rag-node ...." -ForegroundColor Cyan
try {
    npm install -g @godspeedsystems/rag-node
} catch {
    Write-Host "rag-node installation failed: $_" -ForegroundColor Red
    exit
}

# Locate global pnpm install directory
Write-Host "Locating global rag-node installation directory..."
$pnpmPrefix = cmd /c "npm prefix -g"
$ragNodeDir = Join-Path $pnpmPrefix "node_modules\rag-node"

if (-not (Test-Path $ragNodeDir)) {
    Write-Host "rag-node installation directory not found at expected location: $ragNodeDir" -ForegroundColor Red
    exit
}

# Prompt user for GOOGLE_API_KEY with masking
# Write-Host "`nEnter your GOOGLE_API_KEY for rag-node." -ForegroundColor Cyan
# Write-Host "Note: This key will NOT be stored or transmitted to any Godspeed server." -ForegroundColor Yellow
# Write-Host "It will remain saved ONLY in the local '.env' file on your machine." -ForegroundColor Yellow
# # Write-Host "Paste your key below:" -ForegroundColor Cyan

# $plainKey = Read-Host -Prompt "GOOGLE_API_KEY"

# # Write to .env file
# $envFilePath = Join-Path $ragNodeDir ".env"
# try {
#     Write-Host "Writing GOOGLE_API_KEY to .env file..."
#     Set-Content -Path $envFilePath -Value "GOOGLE_API_KEY=$plainKey"
#     Write-Host "Successfully configured API Key" -ForegroundColor Green
# } catch {
#     Write-Host "Failed to write .env file: $_" -ForegroundColor Red
#     exit
# }

# Final checks
Write-Host "`nVerifying installations..." -ForegroundColor Cyan
Write-Host "Godspeed CLI version: $(godspeed --version)"
Write-Host "Node.js version: $(node -v)"
Write-Host "npm version: $(npm -v)"
Write-Host "Git version: $(git --version)"

Write-Host "`nInstallation complete! Please restart your terminal for all changes to take effect." -ForegroundColor Green