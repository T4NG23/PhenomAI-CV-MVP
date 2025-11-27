#!/usr/bin/env node

/**
 * Build Executable Script
 * 
 * Creates a standalone executable for the Interview Integrity system
 * that can be distributed to interviewers.
 * 
 * Supports: Windows (.exe), macOS (.app), Linux (.AppImage)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building Interview Integrity Executable\n');

const platform = process.platform;
const arch = process.arch;
const version = require('../package.json').version;

console.log(`Platform: ${platform}`);
console.log(`Architecture: ${arch}`);
console.log(`Version: ${version}\n`);

// Check if required tools are installed
function checkDependencies() {
  console.log('Checking dependencies...');
  
  const required = ['node', 'npm', 'docker'];
  const missing = [];
  
  required.forEach(tool => {
    try {
      execSync(`${tool} --version`, { stdio: 'ignore' });
      console.log(`  ✓ ${tool}`);
    } catch (e) {
      console.log(`  ✗ ${tool}`);
      missing.push(tool);
    }
  });
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing dependencies: ${missing.join(', ')}`);
    console.log('Please install the missing dependencies and try again.\n');
    process.exit(1);
  }
  
  console.log('✅ All dependencies installed\n');
}

// Build the Next.js application
function buildWebApp() {
  console.log('Building web application...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Web app built successfully\n');
  } catch (e) {
    console.error('❌ Failed to build web app');
    process.exit(1);
  }
}

// Build Docker images
function buildDockerImages() {
  console.log('Building Docker images...');
  const services = [
    'api-gateway',
    'realtime-engine',
    'cv-inference',
    'vlm-service'
  ];
  
  services.forEach(service => {
    console.log(`  Building ${service}...`);
    try {
      execSync(
        `docker build -t interview-integrity-${service}:${version} ./${service}`,
        { stdio: 'inherit' }
      );
      console.log(`  ✓ ${service}`);
    } catch (e) {
      console.error(`  ✗ ${service} build failed`);
      process.exit(1);
    }
  });
  
  console.log('✅ All Docker images built\n');
}

// Create portable package
function createPortablePackage() {
  console.log('Creating portable package...');
  
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Create launcher script
  const launcherScript = platform === 'win32' 
    ? createWindowsLauncher() 
    : createUnixLauncher();
  
  const launcherPath = path.join(distDir, platform === 'win32' ? 'start.bat' : 'start.sh');
  fs.writeFileSync(launcherPath, launcherScript);
  
  if (platform !== 'win32') {
    fs.chmodSync(launcherPath, '755');
  }
  
  // Copy necessary files
  const filesToCopy = [
    'package.json',
    'README.md',
    'LICENSE',
    '.env.example'
  ];
  
  filesToCopy.forEach(file => {
    const src = path.join(__dirname, '..', file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
  
  // Copy Docker Compose files
  const infraDir = path.join(distDir, 'infra');
  if (!fs.existsSync(infraDir)) {
    fs.mkdirSync(infraDir, { recursive: true });
  }
  
  fs.copyFileSync(
    path.join(__dirname, '..', 'infra', 'docker-compose.yml'),
    path.join(infraDir, 'docker-compose.yml')
  );
  
  fs.copyFileSync(
    path.join(__dirname, '..', 'infra', 'docker-compose.demo.yml'),
    path.join(infraDir, 'docker-compose.demo.yml')
  );
  
  console.log('✅ Portable package created\n');
  return distDir;
}

function createWindowsLauncher() {
  return `@echo off
echo ====================================
echo Interview Integrity System
echo Version: ${version}
echo ====================================
echo.

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

:: Ask user for mode
echo Select mode:
echo 1. Live Interview Mode
echo 2. Demo Mode
echo.
set /p mode="Enter choice (1 or 2): "

if "%mode%"=="1" (
    echo.
    echo Starting Live Interview Mode...
    docker-compose -f infra/docker-compose.yml up -d
    start http://localhost:3000
) else if "%mode%"=="2" (
    echo.
    echo Starting Demo Mode...
    docker-compose -f infra/docker-compose.demo.yml up -d
    start http://localhost:3100
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

echo.
echo ====================================
echo System is starting...
echo This may take a minute on first run.
echo ====================================
echo.
echo Press any key to open the application...
pause >nul

echo.
echo To stop the system, run: stop.bat
pause
`;
}

function createUnixLauncher() {
  return `#!/bin/bash

echo "===================================="
echo "Interview Integrity System"
echo "Version: ${version}"
echo "===================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Ask user for mode
echo "Select mode:"
echo "1. Live Interview Mode"
echo "2. Demo Mode"
echo ""
read -p "Enter choice (1 or 2): " mode

if [ "$mode" = "1" ]; then
    echo ""
    echo "Starting Live Interview Mode..."
    docker-compose -f infra/docker-compose.yml up -d
    URL="http://localhost:3000"
elif [ "$mode" = "2" ]; then
    echo ""
    echo "Starting Demo Mode..."
    docker-compose -f infra/docker-compose.demo.yml up -d
    URL="http://localhost:3100"
else
    echo "Invalid choice!"
    exit 1
fi

echo ""
echo "===================================="
echo "System is starting..."
echo "This may take a minute on first run."
echo "===================================="
echo ""

# Wait for services to be ready
sleep 10

# Open browser
if command -v xdg-open > /dev/null; then
    xdg-open "$URL"
elif command -v open > /dev/null; then
    open "$URL"
fi

echo ""
echo "Application running at: $URL"
echo ""
echo "To stop the system, run: ./stop.sh"
`;
}

// Create stop script
function createStopScript(distDir) {
  const stopScript = platform === 'win32' 
    ? `@echo off
echo Stopping Interview Integrity System...
docker-compose -f infra/docker-compose.yml down
docker-compose -f infra/docker-compose.demo.yml down
echo System stopped.
pause`
    : `#!/bin/bash
echo "Stopping Interview Integrity System..."
docker-compose -f infra/docker-compose.yml down
docker-compose -f infra/docker-compose.demo.yml down
echo "System stopped."`;
  
  const stopPath = path.join(distDir, platform === 'win32' ? 'stop.bat' : 'stop.sh');
  fs.writeFileSync(stopPath, stopScript);
  
  if (platform !== 'win32') {
    fs.chmodSync(stopPath, '755');
  }
  
  console.log('✅ Stop script created\n');
}

// Create README for the executable
function createExecutableReadme(distDir) {
  const readme = `# Interview Integrity System - Executable Package

Version: ${version}
Platform: ${platform} (${arch})

## Quick Start

### Windows
1. Double-click \`start.bat\`
2. Select Live or Demo mode
3. The application will open in your browser

### macOS/Linux
1. Open terminal in this directory
2. Run \`./start.sh\`
3. Select Live or Demo mode
4. The application will open in your browser

## Requirements

- Docker Desktop installed and running
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Modern web browser (Chrome, Firefox, Edge, Safari)

## Modes

### Live Interview Mode
Use this during actual interviews. Requires:
- Webcam access
- Microphone access
- Candidate consent

### Demo Mode
Pre-recorded sessions for testing and training.
No actual webcam/mic required.

## Stopping the System

### Windows
Run \`stop.bat\`

### macOS/Linux
Run \`./stop.sh\`

## Troubleshooting

### Docker not running
Start Docker Desktop before running the application.

### Port conflicts
If ports 3000/3100 are in use, edit the docker-compose files in the \`infra\` directory.

### Performance issues
- Close unnecessary applications
- Ensure Docker has at least 4GB RAM allocated
- For GPU acceleration, ensure NVIDIA drivers are installed

## Support

For issues and documentation, visit:
https://github.com/YourOrg/interview-integrity-mvp

## Privacy & Compliance

This system requires explicit candidate consent.
All data is encrypted and can be configured for local-only processing.
See PRIVACY.md for details.
`;
  
  fs.writeFileSync(path.join(distDir, 'README.txt'), readme);
  console.log('✅ Executable README created\n');
}

// Main build process
function main() {
  console.log('Starting build process...\n');
  
  checkDependencies();
  buildWebApp();
  buildDockerImages();
  
  const distDir = createPortablePackage();
  createStopScript(distDir);
  createExecutableReadme(distDir);
  
  console.log('════════════════════════════════════════');
  console.log('✅ Build complete!');
  console.log('════════════════════════════════════════');
  console.log(`\nPackage location: ${distDir}`);
  console.log(`\nTo distribute:`);
  console.log(`  1. Zip the 'dist' folder`);
  console.log(`  2. Share with interviewers`);
  console.log(`  3. Recipients run start.bat (Windows) or start.sh (macOS/Linux)`);
  console.log('\n');
}

// Run the build
main();
