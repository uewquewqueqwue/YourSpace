#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      ...options 
    });
  } catch (error) {
    log(`❌ Error executing: ${command}`, colors.red);
    process.exit(1);
  }
}

function execSilent(command) {
  try {
    return execSync(command, { 
      cwd: rootDir,
      encoding: 'utf8' 
    }).trim();
  } catch (error) {
    return '';
  }
}

// Получаем тип релиза из аргументов
const releaseType = process.argv[2] || 'patch'; // patch, minor, major

if (!['patch', 'minor', 'major'].includes(releaseType)) {
  log('❌ Invalid release type. Use: patch, minor, or major', colors.red);
  process.exit(1);
}

log('\n🚀 Starting release process...', colors.cyan);
log(`📦 Release type: ${releaseType}`, colors.yellow);

// 1. Проверяем, что нет незакоммиченных изменений
log('\n📋 Checking git status...', colors.cyan);
const gitStatus = execSilent('git status --porcelain');
if (gitStatus) {
  log('❌ You have uncommitted changes. Please commit or stash them first.', colors.red);
  log(gitStatus, colors.yellow);
  process.exit(1);
}
log('✅ Git status is clean', colors.green);

// 2. Проверяем, что мы на main/master ветке
log('\n🌿 Checking current branch...', colors.cyan);
const currentBranch = execSilent('git rev-parse --abbrev-ref HEAD');
if (currentBranch !== 'main' && currentBranch !== 'master') {
  log(`⚠️  Warning: You are on branch '${currentBranch}', not 'main' or 'master'`, colors.yellow);
  log('Continue anyway? (y/n)', colors.yellow);
  // В реальном сценарии здесь можно добавить интерактивный промпт
}
log(`✅ Current branch: ${currentBranch}`, colors.green);

// 3. Подтягиваем последние изменения
log('\n⬇️  Pulling latest changes...', colors.cyan);
exec('git pull origin ' + currentBranch);
log('✅ Pulled latest changes', colors.green);

// 4. Запускаем тесты
log('\n🧪 Running tests...', colors.cyan);
exec('yarn test:run');
log('✅ All tests passed', colors.green);

// 5. Обновляем версию в package.json
log(`\n📝 Bumping version (${releaseType})...`, colors.cyan);
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const oldVersion = packageJson.version;

// Парсим версию
const [major, minor, patch] = oldVersion.split('.').map(Number);
let newVersion;

switch (releaseType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

packageJson.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
log(`✅ Version bumped: ${oldVersion} → ${newVersion}`, colors.green);

// 6. Коммитим изменение версии
log('\n💾 Committing version bump...', colors.cyan);
exec('git add package.json');
exec(`git commit -m "chore: bump version to ${newVersion}"`);
log('✅ Version bump committed', colors.green);

// 7. Создаем тег
log('\n🏷️  Creating git tag...', colors.cyan);
const tagName = `v${newVersion}`;
exec(`git tag -a ${tagName} -m "Release ${tagName}"`);
log(`✅ Tag created: ${tagName}`, colors.green);

// 8. Пушим изменения и тег
log('\n⬆️  Pushing to remote...', colors.cyan);
exec(`git push origin ${currentBranch}`);
exec(`git push origin ${tagName}`);
log('✅ Pushed to remote', colors.green);

// 9. Информация о релизе
log('\n' + '='.repeat(60), colors.bright);
log('🎉 Release process completed successfully!', colors.green + colors.bright);
log('='.repeat(60), colors.bright);
log(`\n📦 Version: ${newVersion}`, colors.cyan);
log(`🏷️  Tag: ${tagName}`, colors.cyan);
log(`🌿 Branch: ${currentBranch}`, colors.cyan);
log('\n📋 Next steps:', colors.yellow);
log('  1. GitHub Actions will automatically build the release', colors.reset);
log('  2. Check the Actions tab: https://github.com/uewquewqueqwue/YourSpace/actions', colors.reset);
log('  3. Release will be published when build completes', colors.reset);
log('\n✨ Done!\n', colors.green);
