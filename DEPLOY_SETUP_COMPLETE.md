# ✅ Автоматический деплой настроен!

## 🎉 Что готово

Теперь вы можете делать релизы одной командой:

```bash
yarn release
```

## 📦 Что было настроено

### 1. Скрипт автоматического релиза
**Файл:** `scripts/release.js`

Автоматически выполняет:
- ✅ Проверку git статуса
- ✅ Подтягивание изменений
- ✅ Запуск тестов
- ✅ Обновление версии
- ✅ Создание коммита и тега
- ✅ Пуш в GitHub

### 2. Команды в package.json

```json
{
  "scripts": {
    "release": "node scripts/release.js patch",
    "release:minor": "node scripts/release.js minor",
    "release:major": "node scripts/release.js major"
  }
}
```

### 3. GitHub Actions Workflow
**Файл:** `.github/workflows/build-release.yml`

Автоматически:
- ✅ Собирает для Windows, macOS, Linux
- ✅ Запускает тесты перед сборкой
- ✅ Создает .env файл из секретов
- ✅ Публикует релиз на GitHub
- ✅ Пользователи получают автообновления

### 4. Документация

- ✅ `QUICK_RELEASE.md` - Быстрая инструкция
- ✅ `RELEASE_GUIDE.md` - Подробное руководство
- ✅ `DEPLOY_SETUP_COMPLETE.md` - Этот файл

## 🚀 Как использовать

### Простой релиз (patch)
```bash
yarn release
```
Увеличивает версию: 1.2.9 → 1.2.10

### Релиз с новыми функциями (minor)
```bash
yarn release:minor
```
Увеличивает версию: 1.2.9 → 1.3.0

### Мажорный релиз (major)
```bash
yarn release:major
```
Увеличивает версию: 1.2.9 → 2.0.0

## ⚙️ Настройка GitHub Secrets (ВАЖНО!)

Для работы автоматического деплоя нужно настроить секреты:

### Шаг 1: Откройте настройки
```
https://github.com/uewquewqueqwue/YourSpace/settings/secrets/actions
```

### Шаг 2: Добавьте DATABASE_URL

Нажмите "New repository secret"
- Name: `DATABASE_URL`
- Value: Ваш Prisma Accelerate URL из .env файла
```
prisma+postgres://accelerate.prisma-data.net/?api_key=...
```

### Шаг 3: Добавьте GH_TOKEN

1. Создайте Personal Access Token:
   ```
   https://github.com/settings/tokens/new
   ```

2. Настройте токен:
   - Note: `YourSpace Release Token`
   - Expiration: `No expiration` (или выберите срок)
   - Scopes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `write:packages` (Upload packages)

3. Скопируйте токен (он показывается только один раз!)

4. Добавьте в GitHub Secrets:
   - Name: `GH_TOKEN`
   - Value: Ваш токен

### Шаг 4: Проверьте настройки

Секреты должны выглядеть так:
```
DATABASE_URL    ••••••••••••••••
GH_TOKEN        ••••••••••••••••
```

## 📋 Процесс релиза

### 1. Подготовка
```bash
# Убедитесь, что все изменения закоммичены
git status

# Убедитесь, что вы на main ветке
git branch

# Подтяните последние изменения
git pull
```

### 2. Запуск релиза
```bash
yarn release
```

### 3. Что происходит

**Локально (автоматически):**
1. Проверка git статуса ✅
2. Подтягивание изменений ✅
3. Запуск тестов ✅
4. Обновление версии в package.json ✅
5. Создание коммита: `chore: bump version to X.Y.Z` ✅
6. Создание тега: `vX.Y.Z` ✅
7. Пуш в GitHub ✅

**На GitHub (автоматически):**
1. GitHub Actions запускается ✅
2. Сборка для Windows ✅
3. Сборка для macOS ✅
4. Сборка для Linux ✅
5. Создание релиза ✅
6. Публикация файлов ✅

### 4. Проверка

Откройте:
- **Actions:** https://github.com/uewquewqueqwue/YourSpace/actions
- **Releases:** https://github.com/uewquewqueqwue/YourSpace/releases

Сборка занимает ~10-15 минут.

## 🔍 Мониторинг

### Проверка статуса сборки
```
https://github.com/uewquewqueqwue/YourSpace/actions
```

### Просмотр релизов
```
https://github.com/uewquewqueqwue/YourSpace/releases
```

### Логи сборки
Кликните на workflow в Actions для просмотра логов.

## 🐛 Troubleshooting

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

# Исправьте ошибки
# Попробуйте снова
yarn release
```

### GitHub Actions не запускается

**Проверьте секреты:**
```
https://github.com/uewquewqueqwue/YourSpace/settings/secrets/actions
```

Должны быть:
- ✅ DATABASE_URL
- ✅ GH_TOKEN

**Проверьте тег:**
```bash
git tag -l
git ls-remote --tags origin
```

**Проверьте права токена:**
- Токен должен иметь права `repo` и `write:packages`
- Токен не должен быть просрочен

### Сборка падает с ошибкой

1. Откройте логи в Actions
2. Найдите ошибку
3. Исправьте проблему
4. Удалите неудачный тег:
   ```bash
   git tag -d v1.2.10
   git push origin :refs/tags/v1.2.10
   ```
5. Попробуйте снова

## 📚 Дополнительная информация

### Структура файлов

```
.
├── scripts/
│   └── release.js              # Скрипт автоматического релиза
├── .github/
│   └── workflows/
│       └── build-release.yml   # GitHub Actions workflow
├── QUICK_RELEASE.md            # Быстрая инструкция
├── RELEASE_GUIDE.md            # Подробное руководство
└── DEPLOY_SETUP_COMPLETE.md    # Этот файл
```

### Версионирование

Проект использует [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0) - Breaking changes
- **MINOR** (0.X.0) - Новые функции (обратно совместимые)
- **PATCH** (0.0.X) - Багфиксы

### Автообновления

Пользователи получают обновления автоматически:

1. При запуске приложения проверяется GitHub Releases
2. Если есть новая версия - показывается уведомление
3. Пользователь может скачать и установить обновление
4. Приложение перезапускается с новой версией

## ✨ Готово!

Теперь вы можете делать релизы одной командой:

```bash
yarn release
```

Всё остальное произойдет автоматически! 🚀

---

**Вопросы?** Читайте [RELEASE_GUIDE.md](./RELEASE_GUIDE.md) для подробной информации.
