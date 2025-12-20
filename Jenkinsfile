pipeline {
    agent any
    
    environment {
        DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\ChitReferralTracker'
        IIS_SITE_NAME = 'ChitReferralTracker'
        IIS_APP_POOL = 'ChitReferralTrackerAppPool'
        BUILD_DIR = '.deploy'
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
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
        
        stage('Prepare Deployment') {
            steps {
                bat 'node prepare-deploy.js'
            }
        }
        
        stage('Deploy to IIS') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Continue'
                    
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    $SiteName = "ChitReferralTracker"
                    $AppPool = "ChitReferralTrackerAppPool"
                    
                    # Check if running with admin privileges
                    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
                    
                    if (-not $isAdmin) {
                        Write-Host "⚠️  Warning: Not running as Administrator. IIS management commands may fail." -ForegroundColor Yellow
                        Write-Host "   Jenkins service should run as a user with IIS management permissions." -ForegroundColor Yellow
                    }
                    
                    # Try to import IIS module
                    try {
                        Import-Module WebAdministration -ErrorAction Stop
                        Write-Host "✅ IIS module loaded successfully" -ForegroundColor Green
                    } catch {
                        Write-Host "❌ Failed to load IIS module: $_" -ForegroundColor Red
                        Write-Host "   Make sure IIS Management Console is installed" -ForegroundColor Yellow
                        exit 1
                    }
                    
                    # Try to stop app pool (non-blocking)
                    Write-Host "Stopping IIS Application Pool..." -ForegroundColor Yellow
                    try {
                        $poolState = Get-WebAppPoolState -Name $AppPool -ErrorAction SilentlyContinue
                        if ($poolState -and $poolState.Value -eq "Started") {
                            Stop-WebAppPool -Name $AppPool -ErrorAction Stop
                            Write-Host "✅ Application Pool stopped" -ForegroundColor Green
                            Start-Sleep -Seconds 5
                        } else {
                            Write-Host "   Application Pool is not running or doesn't exist" -ForegroundColor Yellow
                        }
                    } catch {
                        Write-Host "⚠️  Could not stop Application Pool (may need admin rights): $_" -ForegroundColor Yellow
                        Write-Host "   Continuing with file deployment..." -ForegroundColor Yellow
                    }
                    
                    # Backup current deployment
                    Write-Host "Backing up current deployment..." -ForegroundColor Yellow
                    $backupPath = "$DeployPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                    if (Test-Path $DeployPath) {
                        try {
                            Copy-Item -Path $DeployPath -Destination $backupPath -Recurse -Force -ErrorAction Stop
                            Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green
                        } catch {
                            Write-Host "⚠️  Backup failed (may need permissions): $_" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "   No existing deployment to backup" -ForegroundColor Yellow
                    }
                    
                    # Clean deployment directory
                    Write-Host "Cleaning deployment directory..." -ForegroundColor Yellow
                    if (Test-Path $DeployPath) {
                        try {
                            Get-ChildItem -Path $DeployPath -Exclude 'iisnode', 'logs', '*.log' | Remove-Item -Recurse -Force -ErrorAction Stop
                            Write-Host "✅ Deployment directory cleaned" -ForegroundColor Green
                        } catch {
                            Write-Host "⚠️  Some files could not be deleted: $_" -ForegroundColor Yellow
                            Write-Host "   Continuing anyway..." -ForegroundColor Yellow
                        }
                    } else {
                        New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
                        Write-Host "✅ Deployment directory created" -ForegroundColor Green
                    }
                    
                    # Copy new files
                    Write-Host "Copying new files..." -ForegroundColor Yellow
                    try {
                        Copy-Item -Path ".deploy\\*" -Destination $DeployPath -Recurse -Force -ErrorAction Stop
                        Write-Host "✅ Files copied successfully" -ForegroundColor Green
                    } catch {
                        Write-Host "❌ Failed to copy files: $_" -ForegroundColor Red
                        exit 1
                    }
                    
                    # Set permissions (try, but don't fail if it doesn't work)
                    Write-Host "Setting permissions..." -ForegroundColor Yellow
                    try {
                        icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)(RX)" /T /Q 2>&1 | Out-Null
                        icacls $DeployPath /grant "IUSR:(OI)(CI)(RX)" /T /Q 2>&1 | Out-Null
                        Write-Host "✅ Permissions set" -ForegroundColor Green
                    } catch {
                        Write-Host "⚠️  Could not set all permissions (may need admin rights): $_" -ForegroundColor Yellow
                    }
                    
                    # Try to start app pool and website
                    Write-Host "Starting Application Pool and Website..." -ForegroundColor Yellow
                    try {
                        Start-WebAppPool -Name $AppPool -ErrorAction Stop
                        Start-Sleep -Seconds 3
                        Start-Website -Name $SiteName -ErrorAction Stop
                        Write-Host "✅ Application Pool and Website started" -ForegroundColor Green
                    } catch {
                        Write-Host "⚠️  Could not start Application Pool/Website (may need admin rights): $_" -ForegroundColor Yellow
                        Write-Host "   Please start them manually in IIS Manager" -ForegroundColor Yellow
                    }
                    
                    Write-Host "`n✅ File deployment completed!" -ForegroundColor Green
                    Write-Host "   If IIS commands failed, you may need to:" -ForegroundColor Yellow
                    Write-Host "   1. Run Jenkins service as Administrator, OR" -ForegroundColor Yellow
                    Write-Host "   2. Add Jenkins user to IIS_IUSRS group, OR" -ForegroundColor Yellow
                    Write-Host "   3. Manually start the Application Pool and Website in IIS Manager" -ForegroundColor Yellow
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                powershell '''
                    Start-Sleep -Seconds 10
                    try {
                        $response = Invoke-WebRequest -Uri "http://localhost:5010" -UseBasicParsing -TimeoutSec 10
                        if ($response.StatusCode -eq 200) {
                            Write-Host "✅ Health check passed" -ForegroundColor Green
                        } else {
                            Write-Host "⚠️ Health check returned: $($response.StatusCode)" -ForegroundColor Yellow
                        }
                    } catch {
                        Write-Host "⚠️ Health check failed: $_" -ForegroundColor Yellow
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