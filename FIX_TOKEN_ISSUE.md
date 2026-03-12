# 🔧 Исправление проблемы с GH_TOKEN

## Проблема

```
Error: GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"
```

Electron-builder не видит GH_TOKEN, хотя он передается через `env:` в workflow.

## Причина

В Windows переменные окружения из GitHub Actions не всегда корректно передаются в дочерние процессы (yarn/electron-builder).

## Решение 1: Использовать GITHUB_TOKEN (встроенный)

GitHub Actions автоматически предоставляет токен `GITHUB_TOKEN` с правами на репозиторий.

### Обновите workflow:

```yaml
- name: Build and publish
  run: yarn push
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Преимущества:
- ✅ Не нужно создавать Personal Access Token
- ✅ Автоматически обновляется
- ✅ Безопаснее

### Недостатки:
- ❌ Может не работать для приватных репозиториев (нужно проверить)

## Решение 2: Передать через package.json

Добавьте GH_TOKEN в electron-builder config:

```json
"build": {
  "publish": {
    "provider": "github",
    "token": "${GH_TOKEN}"
  }
}
```

## Решение 3: Использовать secrets.GITHUB_TOKEN

Попробуйте использовать встроенный токен GitHub Actions:

```yaml
- name: Build and publish
  run: yarn push
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Решение 4: Проверить права токена

Если используете Personal Access Token:

1. Откройте: https://github.com/settings/tokens
2. Найдите ваш токен
3. Убедитесь, что есть права:
   - ✅ `repo` (Full control)
   - ✅ `write:packages`

## Решение 5: Добавить в .env файл

Обновите шаг создания .env:

```yaml
- name: Create .env file
  run: |
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
    echo "GH_TOKEN=${{ secrets.GH_TOKEN }}" >> .env
    echo "NODE_ENV=production" >> .env
  shell: bash
```

И обновите electron-builder, чтобы читал из .env:

```bash
yarn add -D dotenv-cli
```

Измените скрипт:
```json
"push": "dotenv -e .env -- yarn build && electron-builder --publish always"
```

## Текущее исправление

Я обновил workflow, добавив `GITHUB_TOKEN` в дополнение к `GH_TOKEN`:

```yaml
- name: Build and publish
  run: yarn push
  env:
    GH_TOKEN: ${{ secrets.GH_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
```

Electron-builder может искать токен под разными именами, поэтому передаем оба.

## Тестирование

После коммита изменений:

```bash
git add .
git commit -m "fix: add GITHUB_TOKEN env variable"
git push

# Удалите старый тег
git tag -d v1.3.2
git push origin :refs/tags/v1.3.2

# Создайте новый релиз
yarn release
```

## Если не помогло

Попробуйте использовать встроенный `secrets.GITHUB_TOKEN` вместо вашего Personal Access Token:

```yaml
- name: Build and publish
  run: yarn push
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Это токен, который GitHub Actions создает автоматически для каждого workflow.
