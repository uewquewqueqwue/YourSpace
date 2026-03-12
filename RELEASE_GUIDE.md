# 🚀 Руководство по релизу

## Быстрый старт

Для создания нового релиза просто выполните:

```bash
yarn release
```

Это автоматически:
1. ✅ Проверит git статус
2. ✅ Подтянет последние изменения
3. ✅ Запустит тесты
4. ✅ Увеличит версию (patch)
5. ✅ Создаст коммит и тег
6. ✅ Запушит в GitHub
7. ✅ GitHub Actions автоматически соберет и опубликует релиз

## Типы релизов

### Patch (1.2.9 → 1.2.10)
Для багфиксов и мелких изменений:
```bash
yarn release
# или
yarn release:patch
```

### Minor (1.2.9 → 1.3.0)
Для новых функций (обратно совместимых):
```bash
yarn release:minor
```

### Major (1.2.9 → 2.0.0)
Для breaking changes:
```bash
yarn release:major
```

## Процесс релиза

### 1. Подготовка

Убедитесь, что:
- Все изменения закоммичены
- Вы на ветке `main` или `master`
- Все тесты проходят локально

### 2. Запуск релиза

```bash
# Для patch релиза (рекомендуется)
yarn release

# Для minor релиза
yarn release:minor

# Для major релиза
yarn release:major
```

### 3. Что происходит автоматически

Скрипт выполнит:

1. **Проверка git статуса**
   - Проверяет, что нет незакоммиченных изменений
   - Проверяет текущую ветку

2. **Обновление кода**
   - Подтягивает последние изменения с GitHub

3. **Тестирование**
   - Запускает все тесты (`yarn test:run`)
   - Если тесты не проходят - процесс останавливается

4. **Обновление версии**
   - Обновляет версию в `package.json`
   - Создает коммит: `chore: bump version to X.Y.Z`

5. **Создание тега**
   - Создает git тег: `vX.Y.Z`

6. **Публикация**
   - Пушит коммит и тег в GitHub
   - GitHub Actions автоматически запускается

### 4. GitHub Actions

После пуша тега GitHub Actions автоматически:

1. **Собирает приложение** для всех платформ:
   - Windows (NSIS installer)
   - macOS (DMG)
   - Linux (AppImage, DEB)

2. **Создает релиз** на GitHub с:
   - Всеми собранными файлами
   - Автоматическими release notes

3. **Публикует обновление**
   - Пользователи получат уведомление об обновлении
   - Автоматическое обновление через electron-updater

## Настройка GitHub Secrets

Для работы автоматического деплоя нужно настроить секреты в GitHub:

### 1. Перейдите в настройки репозитория
```
https://github.com/uewquewqueqwue/YourSpace/settings/secrets/actions
```

### 2. Добавьте следующие секреты:

#### `DATABASE_URL`
Ваш Prisma Accelerate URL:
```
prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

#### `GH_TOKEN`
Personal Access Token с правами:
- `repo` (полный доступ к репозиториям)
- `write:packages` (публикация пакетов)

Создать токен: https://github.com/settings/tokens/new

**Важно:** Токен должен иметь права на запись в репозиторий!

## Проверка статуса сборки

После запуска релиза:

1. Откройте вкладку Actions:
   ```
   https://github.com/uewquewqueqwue/YourSpace/actions
   ```

2. Найдите workflow "Build and Release"

3. Дождитесь завершения сборки (обычно 10-15 минут)

4. Проверьте созданный релиз:
   ```
   https://github.com/uewquewqueqwue/YourSpace/releases
   ```

## Откат релиза

Если что-то пошло не так:

### 1. Удалить тег локально и на GitHub
```bash
# Локально
git tag -d v1.2.10

# На GitHub
git push origin :refs/tags/v1.2.10
```

### 2. Откатить версию в package.json
```bash
git revert HEAD
git push origin main
```

### 3. Удалить релиз на GitHub
Перейдите в Releases и удалите неудачный релиз вручную.

## Troubleshooting

### Ошибка: "You have uncommitted changes"
```bash
# Закоммитьте изменения
git add .
git commit -m "fix: your changes"

# Или спрячьте их
git stash
```

### Ошибка: "Tests failed"
```bash
# Запустите тесты локально
yarn test

# Исправьте ошибки и попробуйте снова
```

### Ошибка: "Permission denied" при пуше
```bash
# Проверьте права доступа к репозиторию
git remote -v

# Убедитесь, что используете правильный токен
```

### GitHub Actions не запускается
1. Проверьте, что тег создан: `git tag -l`
2. Проверьте, что тег запушен: `git ls-remote --tags origin`
3. Проверьте настройки Actions в репозитории

## Лучшие практики

### ✅ Рекомендуется

- Делайте релизы регулярно (каждую неделю/спринт)
- Используйте `patch` для багфиксов
- Используйте `minor` для новых функций
- Используйте `major` только для breaking changes
- Всегда проверяйте тесты перед релизом
- Пишите понятные commit messages

### ❌ Не рекомендуется

- Делать релиз с незакоммиченными изменениями
- Пропускать тесты
- Делать релиз с ветки feature
- Удалять теги после публикации релиза

## Пример workflow

```bash
# 1. Работаете над фичей
git checkout -b feature/new-feature
# ... делаете изменения ...
git commit -m "feat: add new feature"

# 2. Мержите в main
git checkout main
git merge feature/new-feature
git push origin main

# 3. Делаете релиз
yarn release:minor

# 4. Проверяете Actions
# https://github.com/uewquewqueqwue/YourSpace/actions

# 5. Готово! 🎉
```

## Автоматические обновления

Пользователи получат обновление автоматически:

1. При запуске приложения проверяется наличие обновлений
2. Если обновление доступно - показывается уведомление
3. Пользователь может скачать и установить обновление
4. После установки приложение перезапускается

## Мониторинг релизов

### Статистика скачиваний
```
https://github.com/uewquewqueqwue/YourSpace/releases
```

### Логи сборки
```
https://github.com/uewquewqueqwue/YourSpace/actions
```

### Ошибки пользователей
Проверяйте Issues на GitHub для отчетов об ошибках.

---

**Готово!** Теперь вы можете делать релизы одной командой: `yarn release` 🚀
