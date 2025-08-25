const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Preparing deployment package for IIS...');
console.log('==========================================');

// Configuration
const DEPLOY_DIR = '.deploy';
const REQUIRED_FILES = [
  '.next',
  'node_modules',
  'server.js',
  'web.config',
  'package.json',
  'package-lock.json'
];

const OPTIONAL_FILES = [
  '.env.local',
  '.env.production'
];

// Clean and create deploy directory
function cleanDeployDir() {
  console.log('📁 Cleaning deployment directory...');
  if (fs.existsSync(DEPLOY_DIR)) {
    fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });
}

// Copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Warning: ${src} does not exist, skipping...`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy single file
function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Warning: ${src} does not exist, skipping...`);
    return false;
  }
  
  fs.copyFileSync(src, dest);
  return true;
}

// Build the application
function buildApp() {
  console.log('🏗️  Building application...');
  try {
    execSync('npm run build:iis', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Copy required files
function copyRequiredFiles() {
  console.log('📋 Copying required files...');
  
  for (const file of REQUIRED_FILES) {
    const srcPath = path.join(process.cwd(), file);
    const destPath = path.join(process.cwd(), DEPLOY_DIR, file);
    
    if (fs.existsSync(srcPath)) {
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        console.log(`�� Copying directory: ${file}`);
        copyDir(srcPath, destPath);
      } else {
        console.log(`📄 Copying file: ${file}`);
        copyFile(srcPath, destPath);
      }
    } else {
      console.log(`❌ Error: Required file/directory ${file} not found`);
      process.exit(1);
    }
  }
}

// Copy optional files
function copyOptionalFiles() {
  console.log('📋 Copying optional files...');
  
  for (const file of OPTIONAL_FILES) {
    const srcPath = path.join(process.cwd(), file);
    const destPath = path.join(process.cwd(), DEPLOY_DIR, file);
    
    if (copyFile(srcPath, destPath)) {
      console.log(`✅ Copied: ${file}`);
    }
  }
}

// Create deployment info file
function createDeployInfo() {
  console.log('📝 Creating deployment info...');
  
  const deployInfo = {
    timestamp: new Date().toISOString(),
    buildInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    files: {
      required: REQUIRED_FILES,
      optional: OPTIONAL_FILES.filter(file => fs.existsSync(path.join(process.cwd(), file)))
    },
    deployment: {
      targetPath: 'C:\\inetpub\\wwwroot\\ChitReferralTracker',
      applicationName: 'ChitReferralTracker',
      httpPort: 5010,
      httpsPort: 5011
    },
    instructions: [
      '1. Copy all contents of .deploy folder to C:\\inetpub\\wwwroot\\ChitReferralTracker\\',
      '2. Install iisnode: https://github.com/Azure/iisnode/releases',
      '3. Install URL Rewrite Module: https://www.iis.net/downloads/microsoft/url-rewrite',
      '4. Create IIS Application Pool (.NET CLR Version: "No Managed Code")',
      '5. Create IIS Website pointing to the deployment folder',
      '6. Set file permissions: icacls "C:\\inetpub\\wwwroot\\ChitReferralTracker" /grant "IIS_IUSRS:(OI)(CI)(RX)" /T',
      '7. Configure environment variables in .env.local',
      '8. Start the website in IIS Manager'
    ]
  };
  
  fs.writeFileSync(
    path.join(process.cwd(), DEPLOY_DIR, 'deploy-info.json'),
    JSON.stringify(deployInfo, null, 2)
  );
  
  // Create README for deployment
  const readme = `# IIS Deployment Package

This folder contains all files needed to deploy ChitReferralTracker to IIS.

## Quick Deployment Steps:

1. **Copy Contents**: Copy all files from this folder to \`C:\\inetpub\\wwwroot\\ChitReferralTracker\\\`

2. **Install Prerequisites**:
   - iisnode: https://github.com/Azure/iisnode/releases
   - URL Rewrite Module: https://www.iis.net/downloads/microsoft/url-rewrite

3. **Configure IIS**:
   - Create Application Pool (.NET CLR Version: "No Managed Code")
   - Create Website pointing to deployment folder
   - Set port to 8080 (or your preferred port)

4. **Set Permissions**:
   \`\`\`cmd
   icacls "C:\\inetpub\\wwwroot\\ChitReferralTracker" /grant "IIS_IUSRS:(OI)(CI)(RX)" /T
   icacls "C:\\inetpub\\wwwroot\\ChitReferralTracker" /grant "IUSR:(OI)(CI)(RX)" /T
   icacls "C:\\inetpub\\wwwroot\\ChitReferralTracker" /grant "NETWORK SERVICE:(OI)(CI)(RX)" /T
   \`\`\`

5. **Configure Environment**:
   - Edit \`.env.local\` with your production settings
   - Set \`NODE_ENV=production\`
   - Configure database connection

6. **Start Application**:
   - Start the website in IIS Manager
   - Access at: http://localhost:5010 or https://localhost:5011

## Files Included:
- \`.next/\` - Built application
- \`node_modules/\` - Dependencies
- \`server.js\` - Entry point
- \`web.config\` - IIS configuration
- \`package.json\` - Project configuration
- \`.env.local\` - Environment variables (if exists)

## Troubleshooting:
- Check iisnode logs in \`iisnode\\\` folder
- Verify all prerequisites are installed
- Ensure file permissions are correct
- Check IIS logs for errors

For detailed instructions, see \`deploy-info.json\`.
`;

  fs.writeFileSync(
    path.join(process.cwd(), DEPLOY_DIR, 'README.md'),
    readme
  );
}

// Calculate folder size
function getFolderSize(folderPath) {
  let size = 0;
  
  function calculateSize(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        calculateSize(itemPath);
      } else {
        size += stat.size;
      }
    }
  }
  
  calculateSize(folderPath);
  return size;
}

// Main execution
function main() {
  try {
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.error('❌ Error: package.json not found. Run this script from the project root.');
      process.exit(1);
    }
    
    // Build the application
    buildApp();
    
    // Clean and prepare deploy directory
    cleanDeployDir();
    
    // Copy files
    copyRequiredFiles();
    copyOptionalFiles();
    
    // Create deployment info
    createDeployInfo();
    
    // Calculate size
    const size = getFolderSize(DEPLOY_DIR);
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    
    console.log('');
    console.log('�� Deployment package prepared successfully!');
    console.log('==========================================');
    console.log(`�� Deployment folder: ${DEPLOY_DIR}/`);
    console.log(`📊 Package size: ${sizeMB} MB`);
    console.log('');
    console.log('�� Next Steps:');
    console.log('1. Copy all contents of .deploy folder to C:\\inetpub\\wwwroot\\');
    console.log('2. Follow the instructions in .deploy/README.md');
    console.log('3. Configure IIS with ports 5010 (HTTP) and 5011 (HTTPS)');
    console.log('');
    console.log('📚 For detailed instructions, see .deploy/deploy-info.json');
    
  } catch (error) {
    console.error('❌ Error preparing deployment:', error.message);
    process.exit(1);
  }
}

// Run the script
main();