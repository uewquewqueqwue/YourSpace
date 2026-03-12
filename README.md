# YourSpace

YourSpace - приложение для запуска и отслеживания приложений с интегрированным todo-менеджером.

## 🚀 Быстрый старт

### Разработка
```bash
# Установка зависимостей
yarn install

# Запуск в dev режиме
yarn dev

# Запуск тестов
yarn test
```

### Релиз
```bash
# Создать новый релиз (автоматически)
yarn release

# Релиз с новыми функциями
yarn release:minor

# Мажорный релиз
yarn release:major
```

Подробнее: [QUICK_RELEASE.md](./QUICK_RELEASE.md)

## 📦 Сборка

```bash
# Production build
yarn build

# Создать дистрибутив
yarn dist
```

## 📚 Документация

- [QUICK_RELEASE.md](./QUICK_RELEASE.md) - Быстрая инструкция по релизам
- [RELEASE_GUIDE.md](./RELEASE_GUIDE.md) - Подробное руководство по релизам
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Обзор рефакторинга
- [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) - Управление секретами

## ✨ Возможности

- 🚀 Запуск и отслеживание приложений
- ✅ Todo-менеджер с папками и тегами
- 🔄 Синхронизация данных
- 🔔 Уведомления о дедлайнах
- 🎨 Темная/светлая тема
- 📊 Статистика использования
- 🔐 Безопасная авторизация
- 🔄 Автоматические обновления

## 🛠 Технологии

- **Frontend:** Vue 3, Pinia, TypeScript
- **Backend:** Express, Prisma, PostgreSQL
- **Desktop:** Electron
- **Testing:** Vitest
- **CI/CD:** GitHub Actions

## 📝 Commit Convention

```
✨ feat: add patch notes modal
🐛 fix: env loading
📝 docs: update README
♻️ refactor: move auth logic
🚀 perf: optimize monitoring
🔧 build: update deps
```