# 🚀 Быстрый релиз - Инструкция

## Одна команда для релиза

```bash
yarn release
```

Вот и всё! 🎉

## Что происходит автоматически

1. ✅ Проверка git статуса
2. ✅ Подтягивание последних изменений
3. ✅ Запуск тестов
4. ✅ Увеличение версии (1.2.9 → 1.2.10)
5. ✅ Создание коммита и тега
6. ✅ Пуш в GitHub
7. ✅ GitHub Actions собирает релиз для Windows/Mac/Linux
8. ✅ Автоматическая публикация релиза

## Другие типы релизов

```bash
# Patch (1.2.9 → 1.2.10) - багфиксы
yarn release

# Minor (1.2.9 → 1.3.0) - новые функции
yarn release:minor

# Major (1.2.9 → 2.0.0) - breaking changes
yarn release:major
```

## Первый раз? Настройте GitHub Secrets

1. Откройте: https://github.com/uewquewqueqwue/YourSpace/settings/secrets/actions

2. Добавьте два секрета:

   **DATABASE_URL:**
   ```
   prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_KEY
   ```

   **GH_TOKEN:**
   - Создайте токен: https://github.com/settings/tokens/new
   - Выберите права: `repo` и `write:packages`
   - Скопируйте токен и добавьте как секрет

3. Готово! Теперь можно делать релизы.

## Проверка статуса

После `yarn release` откройте:
- Actions: https://github.com/uewquewqueqwue/YourSpace/actions
- Releases: https://github.com/uewquewqueqwue/YourSpace/releases

## Troubleshooting

**Ошибка: "uncommitted changes"**
```bash
git add .
git commit -m "fix: your changes"
```

**Ошибка: "tests failed"**
```bash
yarn test
# Исправьте ошибки и попробуйте снова
```

**GitHub Actions не запускается**
- Проверьте, что секреты настроены
- Проверьте, что тег создан: `git tag -l`

---

Подробная документация: [RELEASE_GUIDE.md](./RELEASE_GUIDE.md)
