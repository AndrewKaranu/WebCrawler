// Check if the app is built, if not build it first
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const appMainPath = path.join(__dirname, 'app', 'dist', 'main.js');

if (!fs.existsSync(appMainPath)) {
  console.log('Building Electron app...');
  const buildProcess = spawn('npm', ['run', 'build:app'], { 
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('Build complete, starting Electron...');
      require(appMainPath);
    } else {
      console.error('Build failed with code:', code);
      process.exit(1);
    }
  });
} else {
  // App is already built, just require it
  require(appMainPath);
}
