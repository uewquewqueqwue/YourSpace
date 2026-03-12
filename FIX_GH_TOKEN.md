# 🔧 Исправление GH_TOKEN секрета

## Проблема

В вашем скриншоте секретов видно:

```
Name            Environment     Last updated
DATABASE_URL    DATABASE_URL    7 hours ago
GH_TOKEN        DATABASE_URL    7 hours ago  ← ПРОБЛЕМА!
```

Похоже, что в секрет `GH_TOKEN` было записано значение `DATABASE_URL` вместо Personal Access Token!

## Ошибка в логах

```
Error: GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"
```

Это подтверждает, что GH_TOKEN содержит неправильное значение.

## Решение

### Шаг 1: Создайте Personal Access Token

1. Откройте: https://github.com/settings/tokens/new

2. Заполните форму:
   - **Note**: `YourSpace Release Token`
   - **Expiration**: `No expiration` (или выберите срок)
   - **Scopes** (отметьте галочками):
     - ✅ `repo` (Full control of private repositories)
     - ✅ `write:packages` (Upload packages to GitHub Package Registry)

3. Нажмите **"Generate token"** внизу страницы

4. **ВАЖНО**: Скопируйте токен сразу! Он показывается только один раз!
   - Токен выглядит примерно так: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Шаг 2: Обновите секрет GH_TOKEN

1. Откройте: https://github.com/uewquewqueqwue/YourSpace/settings/secrets/actions

2. Найдите секрет `GH_TOKEN` в списке

3. Нажмите на него (или на кнопку редактирования)

4. Нажмите **"Update secret"** или **"Remove"** и создайте заново

5. В поле **Value** вставьте токен, который вы скопировали на Шаге 1
   - НЕ вставляйте DATABASE_URL!
   - Вставьте токен, который начинается с `ghp_`

6. Нажмите **"Update secret"** или **"Add secret"**

### Шаг 3: Проверьте секреты

После обновления у вас должно быть:

```
Name            Value (скрыто)
DATABASE_URL    ••••••••••••••  (ваш Prisma URL)
GH_TOKEN        ••••••••••••••  (токен начинается с ghp_)
```

### Шаг 4: Повторите релиз

После исправления секрета:

```bash
# Удалите неудачный тег
git tag -d v1.3.2
git push origin :refs/tags/v1.3.2

# Запустите релиз заново
yarn release
```

## Как проверить, что токен правильный

Правильный Personal Access Token:
- ✅ Начинается с `ghp_`
- ✅ Длина ~40-50 символов
- ✅ Содержит только буквы и цифры
- ✅ Создан на странице https://github.com/settings/tokens

Неправильно (DATABASE_URL):
- ❌ Начинается с `prisma+postgres://`
- ❌ Это URL базы данных, а не токен!

## Пример правильных значений

### DATABASE_URL (для справки):
```
prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### GH_TOKEN (правильный):
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## После исправления

Сборка должна пройти успешно:

```
• building block map  blockMapFile=dist_electron\YourSpace Setup 1.3.2.exe.blockmap
• uploading to GitHub Releases  file=YourSpace Setup 1.3.2.exe
✅ Published to GitHub Releases
```

## Если всё равно не работает

Проверьте права токена:

1. Откройте: https://github.com/settings/tokens
2. Найдите токен `YourSpace Release Token`
3. Убедитесь, что отмечены:
   - ✅ `repo`
   - ✅ `write:packages`
4. Если нет - создайте новый токен с правильными правами

---

**Важно**: Никогда не путайте DATABASE_URL и GH_TOKEN - это совершенно разные вещи!
