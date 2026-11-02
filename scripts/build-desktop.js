const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

function log(msg) {
  console.log(`\x1b[36m[Desktop Build]\x1b[0m ${msg}`);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  log('Starting Next.js production build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  log('Verifying standalone output...');
  if (!fs.existsSync(standaloneDir)) {
    throw new Error('.next/standalone was not generated! Ensure output: "standalone" is in next.config.mjs');
  }

  log('Copying static assets into standalone bundle...');
  const staticSrc = path.join(rootDir, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  copyRecursiveSync(staticSrc, staticDest);

  log('Copying public directory into standalone bundle...');
  const publicSrc = path.join(rootDir, 'public');
  const publicDest = path.join(standaloneDir, 'public');
  copyRecursiveSync(publicSrc, publicDest);

  log('Copying yt-dlp binary into standalone bundle...');
  const ytdlSrc = path.join(rootDir, 'yt-dlp.exe');
  if (fs.existsSync(ytdlSrc)) {
    fs.copyFileSync(ytdlSrc, path.join(standaloneDir, 'yt-dlp.exe'));
  }

  const envLocalSrc = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocalSrc)) {
    log('Copying .env.local to standalone directory...');
    fs.copyFileSync(envLocalSrc, path.join(standaloneDir, '.env.local'));
    fs.copyFileSync(envLocalSrc, path.join(standaloneDir, '.env.production'));
  }

  log('Ensuring icons exist in build directory...');
  const buildDir = path.join(rootDir, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const faviconPath = path.join(rootDir, 'src', 'app', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    fs.copyFileSync(faviconPath, path.join(buildDir, 'icon.ico'));
  }

  const logoPath = path.join(rootDir, 'public', 'myujiku-logo.png');
  if (fs.existsSync(logoPath)) {
    fs.copyFileSync(logoPath, path.join(buildDir, 'icon.png'));
  }

  log('Packaging Windows Executable and Installer with electron-builder...');
  execSync('npx electron-builder --win', { cwd: rootDir, stdio: 'inherit' });

  log('Verifying unpacked resources...');
  const unpackedNodeModules = path.join('F:', 'Myujiku', 'win-unpacked', 'resources', 'standalone', 'node_modules');
  const standaloneNodeModules = path.join(standaloneDir, 'node_modules');
  if (!fs.existsSync(unpackedNodeModules) && fs.existsSync(standaloneNodeModules)) {
    log('Syncing standalone node_modules into unpacked distribution...');
    copyRecursiveSync(standaloneNodeModules, unpackedNodeModules);
  }

  log('Build complete! Output stored in F:\\Myujiku');
}

build().catch((err) => {
  console.error('\x1b[31m[Desktop Build Error]\x1b[0m', err);
  process.exit(1);
});
