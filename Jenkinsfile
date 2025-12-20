pipeline {
    agent any
    
    environment {
        DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\ChitReferralTracker'
        IIS_SITE_NAME = 'ChitReferralTracker'
        IIS_APP_POOL = 'ChitReferralTrackerAppPool'
        BUILD_DIR = '.deploy'
        BACKUP_PATH = 'C:\\inetpub\\backups'
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
                bat 'npm install'
            }
        }
        
        stage('Prepare Deployment') {
            steps {
                bat 'npm run prepare-deploy'
            }
        }
        
        stage('Backup Old Deployment') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Continue'
                    
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    $BackupPath = "C:\\inetpub\\backups"
                    
                    Write-Host "📦 Step 4: Backing up old deployment..." -ForegroundColor Cyan
                    
                    # Create backup directory if it doesn't exist
                    if (-not (Test-Path $BackupPath)) {
                        try {
                            New-Item -Path $BackupPath -ItemType Directory -Force | Out-Null
                            Write-Host "✅ Backup directory created: $BackupPath" -ForegroundColor Green
                        } catch {
                            Write-Host "❌ Failed to create backup directory: $_" -ForegroundColor Red
                            exit 1
                        }
                    }
                    
                    # Check if deployment directory exists and has content
                    if (Test-Path $DeployPath) {
                        $hasContent = (Get-ChildItem -Path $DeployPath -Force | Measure-Object).Count -gt 0
                        if ($hasContent) {
                            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                            $backupZipName = "ChitReferralTracker-backup-$timestamp.zip"
                            $backupZipPath = Join-Path $BackupPath $backupZipName
                            
                            try {
                                # Create zip backup
                                Write-Host "   Creating zip backup: $backupZipName" -ForegroundColor Yellow
                                Compress-Archive -Path "$DeployPath\\*" -DestinationPath $backupZipPath -Force -ErrorAction Stop
                                Write-Host "✅ Backup created successfully: $backupZipPath" -ForegroundColor Green
                            } catch {
                                Write-Host "❌ Failed to create backup: $_" -ForegroundColor Red
                                Write-Host "   Deployment will continue, but backup failed" -ForegroundColor Yellow
                            }
                        } else {
                            Write-Host "   No existing content to backup" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "   Deployment directory doesn't exist yet - nothing to backup" -ForegroundColor Yellow
                    }
                '''
            }
        }
        
        stage('Stop App Pool') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Continue'
                    
                    $AppPool = "ChitReferralTrackerAppPool"
                    
                    Write-Host "⏸️  Step 5: Stopping Application Pool..." -ForegroundColor Cyan
                    
                    # Import IIS module
                    try {
                        Import-Module WebAdministration -ErrorAction Stop
                        Write-Host "✅ IIS module loaded" -ForegroundColor Green
                    } catch {
                        Write-Host "❌ Failed to load IIS module: $_" -ForegroundColor Red
                        Write-Host "   Make sure IIS Management Console is installed" -ForegroundColor Yellow
                        exit 1
                    }
                    
                    # Stop app pool
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
                        Write-Host "❌ Failed to stop Application Pool: $_" -ForegroundColor Red
                        Write-Host "   Make sure Jenkins user has IIS management permissions" -ForegroundColor Yellow
                        exit 1
                    }
                '''
            }
        }
        
        stage('Delete Old Files') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Continue'
                    
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    
                    Write-Host "🗑️  Step 6: Deleting everything from deployment folder..." -ForegroundColor Cyan
                    
                    if (Test-Path $DeployPath) {
                        try {
                            # Delete everything in the deployment folder
                            Get-ChildItem -Path $DeployPath -Force | Remove-Item -Recurse -Force -ErrorAction Stop
                            Write-Host "✅ All files deleted from deployment folder" -ForegroundColor Green
                        } catch {
                            Write-Host "❌ Failed to delete files: $_" -ForegroundColor Red
                            Write-Host "   Make sure Jenkins user has write permissions to: $DeployPath" -ForegroundColor Yellow
                            exit 1
                        }
                    } else {
                        Write-Host "   Deployment directory doesn't exist - creating it" -ForegroundColor Yellow
                        New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
                        Write-Host "✅ Deployment directory created" -ForegroundColor Green
                    }
                '''
            }
        }
        
        stage('Copy New Files') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Continue'
                    
                    $DeployPath = "C:\\inetpub\\wwwroot\\ChitReferralTracker"
                    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
                    
                    Write-Host "📋 Step 7: Copying files from .deploy folder..." -ForegroundColor Cyan
                    
                    # Ensure deployment directory exists
                    if (-not (Test-Path $DeployPath)) {
                        New-Item -Path $DeployPath -ItemType Directory -Force | Out-Null
                    }
                    
                    # Grant Jenkins user permissions
                    try {
                        icacls $DeployPath /grant "${currentUser}:(OI)(CI)(F)" /T /Q 2>&1 | Out-Null
                    } catch {
                        Write-Host "⚠️  Could not set permissions (may need admin): $_" -ForegroundColor Yellow
                    }
                    
                    # Copy files using robocopy
                    try {
                        $robocopyOutput = & robocopy ".deploy" $DeployPath /E /COPYALL /R:3 /W:5 /NP /NDL /NFL 2>&1
                        $robocopyExitCode = $LASTEXITCODE
                        
                        # Robocopy exit codes: 0-7 are success, 8+ are errors
                        if ($robocopyExitCode -le 7) {
                            Write-Host "✅ Files copied successfully using robocopy (exit code: $robocopyExitCode)" -ForegroundColor Green
                        } else {
                            Write-Host "⚠️  Robocopy returned error code: $robocopyExitCode" -ForegroundColor Yellow
                            Write-Host "   Attempting standard copy as fallback..." -ForegroundColor Yellow
                            Copy-Item -Path ".deploy\\*" -Destination $DeployPath -Recurse -Force -ErrorAction Stop
                            Write-Host "✅ Files copied successfully using fallback method" -ForegroundColor Green
                        }
                    } catch {
                        Write-Host "❌ Failed to copy files: $_" -ForegroundColor Red
                        Write-Host "   Make sure Jenkins user has write permissions to: $DeployPath" -ForegroundColor Yellow
                        exit 1
                    }
                    
                    # Set IIS permissions
                    Write-Host "Setting IIS permissions..." -ForegroundColor Yellow
                    try {
                        icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)(RX)" /T /Q 2>&1 | Out-Null
                        icacls $DeployPath /grant "IUSR:(OI)(CI)(RX)" /T /Q 2>&1 | Out-Null
                        Write-Host "✅ IIS permissions set" -ForegroundColor Green
                    } catch {
                        Write-Host "⚠️  Could not set IIS permissions (may need admin rights): $_" -ForegroundColor Yellow
                    }
                '''
            }
        }
        
        stage('Start App Pool') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Continue'
                    
                    $AppPool = "ChitReferralTrackerAppPool"
                    $SiteName = "ChitReferralTracker"
                    
                    Write-Host "▶️  Step 8: Starting Application Pool..." -ForegroundColor Cyan
                    
                    # Import IIS module
                    try {
                        Import-Module WebAdministration -ErrorAction Stop
                    } catch {
                        Write-Host "❌ Failed to load IIS module: $_" -ForegroundColor Red
                        exit 1
                    }
                    
                    # Start app pool and website
                    try {
                        Start-WebAppPool -Name $AppPool -ErrorAction Stop
                        Start-Sleep -Seconds 3
                        Start-Website -Name $SiteName -ErrorAction Stop
                        Write-Host "✅ Application Pool and Website started successfully" -ForegroundColor Green
                    } catch {
                        Write-Host "❌ Failed to start Application Pool/Website: $_" -ForegroundColor Red
                        Write-Host "   Please start them manually in IIS Manager" -ForegroundColor Yellow
                        exit 1
                    }
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
                        Write-Host "   This may be normal if IIS was not started automatically" -ForegroundColor Yellow
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