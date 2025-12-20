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
                    $ErrorActionPreference = 'Stop'
                    
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    $SiteName = "ChitReferralTracker"
                    $AppPool = "ChitReferralTrackerAppPool"
                    
                    Write-Host "Stopping IIS Application Pool..." -ForegroundColor Yellow
                    Import-Module WebAdministration
                    Stop-WebAppPool -Name $AppPool -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 5
                    
                    Write-Host "Backing up current deployment..." -ForegroundColor Yellow
                    $backupPath = "$DeployPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                    if (Test-Path $DeployPath) {
                        Copy-Item -Path $DeployPath -Destination $backupPath -Recurse -Force
                        Write-Host "Backup created: $backupPath" -ForegroundColor Green
                    }
                    
                    Write-Host "Cleaning deployment directory..." -ForegroundColor Yellow
                    if (Test-Path $DeployPath) {
                        Get-ChildItem -Path $DeployPath -Exclude 'iisnode', 'logs', '*.log' | Remove-Item -Recurse -Force
                    } else {
                        New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
                    }
                    
                    Write-Host "Copying new files..." -ForegroundColor Yellow
                    Copy-Item -Path ".deploy\\*" -Destination $DeployPath -Recurse -Force
                    
                    Write-Host "Setting permissions..." -ForegroundColor Yellow
                    icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)(RX)" /T
                    icacls $DeployPath /grant "IUSR:(OI)(CI)(RX)" /T
                    
                    Write-Host "Starting Application Pool..." -ForegroundColor Yellow
                    Start-WebAppPool -Name $AppPool
                    Start-Sleep -Seconds 3
                    Start-Website -Name $SiteName
                    
                    Write-Host "Deployment completed!" -ForegroundColor Green
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