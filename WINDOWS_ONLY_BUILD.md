# 🪟 Сборка только для Windows

## Что изменилось

Теперь GitHub Actions собирает приложение **только для Windows**, так как вам не нужны macOS и Linux версии.

## Преимущества

### 1. ⚡ Быстрее
- Раньше: ~30-45 минут (3 платформы)
- Сейчас: ~10-15 минут (только Windows)

### 2. 💰 Экономия минут GitHub Actions
- Раньше: ~45 минут на релиз
- Сейчас: ~15 минут на релиз
- Экономия: 30 минут на каждый релиз!

### 3. 🎯 Проще
- Не нужны APPLE_ID и APPLE_ID_PASSWORD
- Только 2 секрета: DATABASE_URL и GH_TOKEN
- Меньше точек отказа

## Что было убрано

### Из workflow:
```yaml
# Убрано:
matrix:
  os: [windows-latest, macos-latest, ubuntu-latest]

# Теперь:
matrix:
  os: [windows-latest]
```

### Из package.json:
```json
// Убрано из build config:
"mac": { ... },
"linux": { ... }

// Осталось только:
"win": { ... }
```

## Если понадобится macOS/Linux

Если в будущем понадобится собирать для других платформ, просто:

1. Откройте `.github/workflows/build-release.yml`
2. Измените:
   ```yaml
   matrix:
     os: [windows-latest, macos-latest, ubuntu-latest]
   ```
3. Добавьте секреты для macOS (если нужно):
   - APPLE_ID
   - APPLE_ID_PASSWORD

## Текущая конфигурация

### Workflow собирает:
- ✅ Windows NSIS installer (.exe)
- ❌ macOS DMG (отключено)
- ❌ Linux AppImage/deb (отключено)

### Время сборки:
- ~10-15 минут для Windows

### Требуемые секреты:
- DATABASE_URL
- GH_TOKEN

## Итог

Теперь релизы будут:
- ⚡ Быстрее (в 3 раза)
- 💰 Дешевле (экономия минут)
- 🎯 Проще (меньше настроек)
- ✅ Надежнее (меньше точек отказа)

И вам всё равно нужна только одна команда:

```bash
yarn release
```

🚀 Всё остальное GitHub сделает сам!
