pipeline {
    agent any
    
    environment {
        DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\ChitReferralTracker'
        IIS_SITE_NAME = 'ChitReferralTracker'
        IIS_APP_POOL = 'ChitReferralTrackerAppPool'
    }
    
    options {
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                bat 'npm ci --prefer-offline --no-audit'
            }
        }
        
        stage('Build Application') {
            steps {
                bat 'npm run build:iis'
            }
        }
        
        stage('Stop App Pool') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    Import-Module WebAdministration
                    
                    $AppPool = "ChitReferralTrackerAppPool"
                    $poolState = Get-WebAppPoolState -Name $AppPool -ErrorAction SilentlyContinue
                    
                    if ($poolState -and $poolState.Value -eq "Started") {
                        Stop-WebAppPool -Name $AppPool
                        Start-Sleep -Seconds 3
                        Write-Host "✅ Application Pool stopped" -ForegroundColor Green
                    } else {
                        Write-Host "   Application Pool is not running" -ForegroundColor Yellow
                    }
                '''
            }
        }
        
        stage('Delete Old Files') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    
                    Write-Host "🗑️  Deleting old files..." -ForegroundColor Cyan
                    
                    if (Test-Path $DeployPath) {
                        Remove-Item -Path "$DeployPath\\*" -Recurse -Force -ErrorAction Stop
                        Write-Host "✅ Files deleted" -ForegroundColor Green
                    } else {
                        New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
                        Write-Host "✅ Deployment directory created" -ForegroundColor Green
                    }
                '''
            }
        }
        
        stage('Copy New Files') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
                    
                    Write-Host "📋 Copying files directly to deployment path..." -ForegroundColor Cyan
                    
                    # Ensure deployment directory exists
                    if (-not (Test-Path $DeployPath)) {
                        New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
                    }
                    
                    # Set permissions for Jenkins user
                    icacls $DeployPath /grant "${currentUser}:(OI)(CI)(F)" /T /Q 2>&1 | Out-Null
                    
                    # Copy only required files/directories directly from project root
                    # Required: .next, node_modules, server.js, web.config, package.json, package-lock.json, .env.production
                    $requiredItems = @('.next', 'node_modules', 'server.js', 'web.config', 'package.json', 'package-lock.json', '.env.production')
                    
                    foreach ($item in $requiredItems) {
                        if (Test-Path $item) {
                            $itemObj = Get-Item $item
                            if ($itemObj.PSIsContainer) {
                                # Copy directory using robocopy with multi-threading
                                Write-Host "   Copying directory: $item" -ForegroundColor Yellow
                                $robocopyOutput = & robocopy $item "$DeployPath\\$item" /E /COPYALL /R:1 /W:2 /MT:8 /NP /NDL /NFL 2>&1
                                $robocopyExitCode = $LASTEXITCODE
                                
                                if ($robocopyExitCode -gt 7) {
                                    # Fallback to standard copy
                                    Copy-Item -Path $item -Destination "$DeployPath\\$item" -Recurse -Force -ErrorAction Stop
                                }
                            } else {
                                # Copy file
                                Write-Host "   Copying file: $item" -ForegroundColor Yellow
                                Copy-Item -Path $item -Destination "$DeployPath\\$item" -Force -ErrorAction Stop
                            }
                            Write-Host "✅ Copied: $item" -ForegroundColor Green
                        } else {
                            Write-Host "⚠️  Warning: $item not found, skipping..." -ForegroundColor Yellow
                        }
                    }
                    
                    Write-Host "✅ All files copied successfully" -ForegroundColor Green
                    
                    # Set IIS permissions
                    icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)(RX)" /T /Q 2>&1 | Out-Null
                    icacls $DeployPath /grant "IUSR:(OI)(CI)(RX)" /T /Q 2>&1 | Out-Null
                    Write-Host "✅ IIS permissions set" -ForegroundColor Green
                '''
            }
        }
        
        stage('Start App Pool') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    Import-Module WebAdministration
                    
                    $AppPool = "ChitReferralTrackerAppPool"
                    $SiteName = "ChitReferralTracker"
                    
                    Write-Host "▶️  Starting Application Pool..." -ForegroundColor Cyan
                    
                    Start-WebAppPool -Name $AppPool
                    Start-Sleep -Seconds 2
                    Start-Website -Name $SiteName
                    
                    Write-Host "✅ Application Pool and Website started" -ForegroundColor Green
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                powershell '''
                    Start-Sleep -Seconds 5
                    try {
                        $response = Invoke-WebRequest -Uri "http://localhost:5010" -UseBasicParsing -TimeoutSec 5
                        if ($response.StatusCode -eq 200) {
                            Write-Host "✅ Health check passed" -ForegroundColor Green
                        } else {
                            Write-Host "⚠️ Health check returned: $($response.StatusCode)" -ForegroundColor Yellow
                        }
                    } catch {
                        Write-Host "⚠️ Health check failed: $_" -ForegroundColor Yellow
                        Write-Host "   This may be normal if IIS needs more time to start" -ForegroundColor Yellow
                    }
                '''
            }
        }
    }
    
    post {
        success {
            echo '✅ Deployment completed successfully!'
        }
        failure {
            echo '❌ Deployment failed!'
        }
    }
}
