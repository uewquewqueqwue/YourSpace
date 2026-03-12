# 🔐 Управление секретами для GitHub Release

## Проблема

Electron приложение нуждается в секретах (DATABASE_URL, JWT_SECRET), но их нельзя хранить в git.

## ✅ Рекомендуемое решение: GitHub Secrets + Build-time injection

### Шаг 1: Добавить секреты в GitHub

1. Перейдите в Settings → Secrets and variables → Actions
2. Добавьте секреты:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GH_TOKEN` (уже есть для releases)

### Шаг 2: Создать GitHub Actions workflow

```yaml
# .github/workflows/build.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: yarn install
        
      - name: Create .env file
        run: |
          echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
          echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
          echo "GH_TOKEN=${{ secrets.GH_TOKEN }}" >> .env
          echo "NODE_ENV=production" >> .env
        shell: bash
        
      - name: Build
        run: yarn build
        
      - name: Release
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
        run: yarn push
```

### Шаг 3: Обновить electron-builder config

```json
// package.json
{
  "build": {
    "extraResources": [
      {
        "from": ".env",
        "to": ".env"
      }
    ]
  }
}
```

---

## 🔄 Альтернативное решение: Hardcode в build (НЕ рекомендуется для чувствительных данных)

Если DATABASE_URL и JWT_SECRET одинаковы для всех пользователей:

### Вариант 1: Environment variables в build time

```typescript
// src/config/env.ts
export const config = {
  databaseUrl: import.meta.env.VITE_DATABASE_URL || process.env.DATABASE_URL,
  jwtSecret: import.meta.env.VITE_JWT_SECRET || process.env.JWT_SECRET,
  nodeEnv: import.meta.env.MODE || process.env.NODE_ENV
}
```

```yaml
# .github/workflows/build.yml
- name: Build with env vars
  env:
    VITE_DATABASE_URL: ${{ secrets.DATABASE_URL }}
    VITE_JWT_SECRET: ${{ secrets.JWT_SECRET }}
  run: yarn build
```

---

## 🎯 Лучшее решение: Разделение секретов

### Для production (одинаковые для всех)
- `DATABASE_URL` - хранить в GitHub Secrets
- Инжектить при build

### Для пользователя (уникальные)
- `JWT_SECRET` - генерировать при первом запуске
- Хранить локально в app data

```typescript
// server/config/secrets.ts
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

interface AppConfig {
  jwtSecret: string
  firstRun: boolean
}

export function getOrCreateConfig(): AppConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  }

  // Первый запуск - генерируем секреты
  const config: AppConfig = {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
    firstRun: true
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  return config
}

// Использование
const config = getOrCreateConfig()
export const JWT_SECRET = config.jwtSecret
```

```typescript
// server/middleware/auth.ts
import { JWT_SECRET } from '../config/secrets'

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}
```

---

## 📦 Итоговая рекомендация

### Для вашего случая:

1. **DATABASE_URL** - хранить в GitHub Secrets, инжектить при build
2. **JWT_SECRET** - генерировать при первом запуске приложения
3. **GH_TOKEN** - хранить в GitHub Secrets для auto-update

### Преимущества:
- ✅ Безопасно (секреты не в git)
- ✅ Каждая установка имеет уникальный JWT_SECRET
- ✅ DATABASE_URL одинаковый для всех (shared backend)
- ✅ Работает с GitHub Releases

### Структура:
```
Build time (GitHub Actions):
├── DATABASE_URL (from GitHub Secrets)
└── GH_TOKEN (from GitHub Secrets)

Runtime (first launch):
└── JWT_SECRET (generated locally)
```

---

## 🚀 Быстрая настройка

### 1. Создайте workflow файл
```bash
mkdir -p .github/workflows
# Скопируйте build.yml из примера выше
```

### 2. Добавьте секреты в GitHub
- Settings → Secrets → New repository secret
- Добавьте DATABASE_URL и GH_TOKEN

### 3. Обновите код для генерации JWT_SECRET
```typescript
// server/config/secrets.ts
// Код из примера выше
```

### 4. Обновите middleware
```typescript
// server/middleware/auth.ts
import { JWT_SECRET } from '../config/secrets'
// Вместо process.env.JWT_SECRET
```

### 5. Push с тегом
```bash
git tag v2.0.0
git push origin v2.0.0
```

GitHub Actions автоматически:
1. Создаст .env с секретами
2. Соберёт приложение
3. Опубликует release

---

## ⚠️ Важные замечания

### Безопасность
- ❌ Никогда не коммитьте .env
- ❌ Никогда не hardcode секреты в код
- ✅ Используйте GitHub Secrets
- ✅ Генерируйте уникальные секреты для каждой установки

### Для разработки
```bash
# .env (локально, не в git)
DATABASE_URL="your_dev_database"
JWT_SECRET="your_dev_secret"
```

### Для production
```bash
# GitHub Secrets (в настройках репозитория)
DATABASE_URL="your_prod_database"
# JWT_SECRET генерируется автоматически
```

---

## 🔍 Проверка

После настройки:
1. ✅ .env в .gitignore
2. ✅ Секреты в GitHub Secrets
3. ✅ Workflow файл создан
4. ✅ JWT_SECRET генерируется при первом запуске
5. ✅ Build работает через GitHub Actions
