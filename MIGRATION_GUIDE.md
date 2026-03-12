# 🔄 Руководство по миграции

## Быстрый старт

### 1. Установка зависимостей
```bash
yarn install
```

### 2. Настройка окружения
```bash
# Скопируйте .env.example в .env
cp .env.example .env

# Заполните реальные значения в .env
# ВАЖНО: Используйте новые секреты, не старые!
```

### 3. Запуск тестов
```bash
# Проверьте что всё работает
yarn test:run
```

### 4. Запуск приложения
```bash
yarn dev
```

---

## Миграция кода

### Stores: Старый → Новый

#### Auth Store
```typescript
// ❌ Старый способ
import { useAuth } from '@/stores/auth'
const auth = useAuth()
auth.user.value // ref

// ✅ Новый способ
import { useAuthStore } from '@/stores/auth.pinia'
const authStore = useAuthStore()
authStore.user // уже reactive, без .value
```

#### Apps Store
```typescript
// ❌ Старый способ
import { useAppsStore, initializeAppsStore } from '@/stores/apps'
const appsStore = useAppsStore()
initializeAppsStore()

// ✅ Новый способ
import { useAppsStore } from '@/stores/apps.pinia'
const appsStore = useAppsStore()
await appsStore.initialize()
```

#### Todo Store
```typescript
// ❌ Старый способ
import { useTodoStore, initializeTodoStore } from '@/stores/todo'
const todoStore = useTodoStore()
initializeTodoStore()

// ✅ Новый способ
import { useTodoStore } from '@/stores/todo.pinia'
const todoStore = useTodoStore()
await todoStore.initialize()
```

---

## Обновление компонентов

### Пример миграции компонента

```vue
<script setup lang="ts">
// ❌ Старый
import { useAuth } from '@/stores/auth'
const auth = useAuth()
const userName = computed(() => auth.user.value?.name)

// ✅ Новый
import { useAuthStore } from '@/stores/auth.pinia'
const authStore = useAuthStore()
const userName = computed(() => authStore.user?.name)
</script>

<template>
  <!-- ❌ Старый -->
  <div>{{ auth.user.value?.name }}</div>
  
  <!-- ✅ Новый -->
  <div>{{ authStore.user?.name }}</div>
</template>
```

---

## Обновление server handlers

### Если вы создавали свои handlers

```typescript
// ❌ Старый способ
ipcMain.handle('myHandler', async (event, data) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  // ...
})

// ✅ Новый способ
import { handleError } from '../utils/errors'
import { myService } from '../services/MyService'

ipcMain.handle('myHandler', async (event, data) => {
  try {
    return await myService.doSomething(data)
  } catch (error) {
    handleError(error, 'myHandler')
  }
})
```

---

## Проверочный список

### Перед деплоем:
- [ ] Все тесты проходят (`yarn test:run`)
- [ ] .env настроен с новыми секретами
- [ ] .env удалён из git
- [ ] Логи работают корректно
- [ ] Приложение запускается без ошибок
- [ ] Миграция БД выполнена (если нужно)

### После деплоя:
- [ ] Мониторинг логов в `logs/`
- [ ] Проверка работы аутентификации
- [ ] Проверка синхронизации данных
- [ ] Проверка rate limiting

---

## Откат изменений

Если что-то пошло не так:

```bash
# Вернуться к предыдущему коммиту
git revert HEAD

# Или откатить конкретные файлы
git checkout HEAD~1 -- src/stores/auth.ts
git checkout HEAD~1 -- server/handlers/auth.ts
```

---

## Частые проблемы

### 1. "Cannot find module 'pinia'"
```bash
yarn add pinia
```

### 2. "JWT_SECRET is not defined"
Проверьте .env файл и убедитесь что JWT_SECRET установлен

### 3. Тесты падают
```bash
# Очистите кеш
yarn cache clean
rm -rf node_modules
yarn install
```

### 4. TypeScript ошибки
```bash
# Перезапустите TypeScript сервер в VSCode
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

---

## Поддержка

Если возникли проблемы:
1. Проверьте REFACTORING.md для деталей
2. Посмотрите логи в `logs/error.log`
3. Запустите тесты с подробным выводом: `yarn test --reporter=verbose`
