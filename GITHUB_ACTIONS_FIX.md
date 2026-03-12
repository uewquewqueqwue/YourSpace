# 🔧 Исправление GitHub Actions Build (Windows Only)

## Что было исправлено

### 1. ✅ Обновлен Node.js до версии 24
**Проблема:** Node.js 20 deprecated, GitHub Actions показывал предупреждения

**Решение:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '24'  # ← Обновлено с 20 на 24
```

### 2. ✅ Добавлена генерация Prisma Client
**Проблема:** Prisma Client не генерировался перед тестами и сборкой

**Решение:**
- Добавлен скрипт в `package.json`:
  ```json
  "prisma:generate": "prisma generate"
  ```
- Добавлен шаг в workflow:
  ```yaml
  - name: Generate Prisma Client
    run: yarn prisma:generate
  ```

### 3. ✅ Добавлен DATABASE_URL в переменные окружения
**Проблема:** DATABASE_URL не передавался в тесты и сборку

**Решение:**
```yaml
- name: Run tests
  run: yarn test:run
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Build application
  run: yarn build
  env:
    NODE_ENV: production
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### 4. ✅ Добавлен email автора
**Проблема:** Linux .deb пакет требовал email автора

**Решение:**
```json
"author": {
  "name": "Uewque",
  "email": "uewque@example.com"
}
```

### 5. ✅ Убрана сборка для macOS и Linux
**Проблема:** Вам нужна только Windows сборка

**Решение:**
```yaml
strategy:
  fail-fast: false
  matrix:
    os: [windows-latest]  # ← Только Windows
```

## Обновленный workflow (только Windows)

Файл: `.github/workflows/build-release.yml`

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest]
        
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'yarn'
          
      - name: Install dependencies
        run: yarn install --frozen-lockfile
        
      - name: Create .env file
        run: |
          echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
          echo "GH_TOKEN=${{ secrets.GH_TOKEN }}" >> .env
          echo "NODE_ENV=production" >> .env
        shell: bash
        
      - name: Generate Prisma Client
        run: yarn prisma:generate
        
      - name: Run tests
        run: yarn test:run
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        
      - name: Build application
        run: yarn build
        env:
          NODE_ENV: production
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        
      - name: Build and publish
        run: yarn push
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

## Что нужно сделать дальше

### 1. Настроить GitHub Secrets (ОБЯЗАТЕЛЬНО!)

Перейдите в настройки репозитория:
```
https://github.com/uewquewqueqwue/YourSpace/settings/secrets/actions
```

Добавьте следующие секреты:

#### DATABASE_URL
- Name: `DATABASE_URL`
- Value: Ваш Prisma Accelerate URL из `.env` файла
- Формат: `prisma+postgres://accelerate.prisma-data.net/?api_key=...`

#### GH_TOKEN
- Name: `GH_TOKEN`
- Value: Personal Access Token с правами `repo` и `write:packages`
- Создать токен: https://github.com/settings/tokens/new

#### APPLE_ID (опционально, для macOS)
- Name: `APPLE_ID`
- Value: Ваш Apple ID email

#### APPLE_ID_PASSWORD (опционально, для macOS)
- Name: `APPLE_ID_PASSWORD`
- Value: App-specific password для Apple ID

### 2. Протестировать релиз

После настройки секретов:

```bash
# Убедитесь, что все изменения закоммичены
git add .
git commit -m "fix: update GitHub Actions workflow"
git push

# Запустите релиз
yarn release
```

### 3. Проверить сборку

1. Откройте Actions:
   ```
   https://github.com/uewquewqueqwue/YourSpace/actions
   ```

2. Дождитесь завершения сборки (~10-15 минут)

3. Проверьте релиз:
   ```
   https://github.com/uewquewqueqwue/YourSpace/releases
   ```

## Возможные проблемы

### Проблема: "DATABASE_URL is not defined"
**Решение:** Проверьте, что секрет `DATABASE_URL` добавлен в GitHub Secrets

### Проблема: "Permission denied" при публикации
**Решение:** 
1. Проверьте, что `GH_TOKEN` имеет права `repo` и `write:packages`
2. Убедитесь, что токен не просрочен

### Проблема: Prisma Client generation failed
**Решение:** 
1. Проверьте, что `DATABASE_URL` в правильном формате
2. Убедитесь, что Prisma Accelerate доступен

### Проблема: Tests failed
**Решение:**
1. Запустите тесты локально: `yarn test:run`
2. Исправьте ошибки
3. Закоммитьте и попробуйте снова

## Проверка локально

Перед релизом убедитесь, что все работает локально:

```bash
# Установите зависимости
yarn install

# Сгенерируйте Prisma Client
yarn prisma:generate

# Запустите тесты
yarn test:run

# Соберите приложение
yarn build

# Если все ОК - делайте релиз
yarn release
```

## Итог

✅ Node.js обновлен до версии 24
✅ Добавлена генерация Prisma Client
✅ DATABASE_URL передается в тесты и сборку
✅ Отключен fail-fast режим
✅ Добавлен скрипт `prisma:generate` в package.json

**Следующий шаг:** Настройте GitHub Secrets и протестируйте релиз!
