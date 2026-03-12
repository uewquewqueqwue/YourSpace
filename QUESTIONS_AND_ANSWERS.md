# ❓ Вопросы и ответы по архитектуре

## Вопросы которые были заданы в начале анализа

### 1. Планируется ли поддержка macOS/Linux?

**Текущее состояние:**
Код завязан на Windows команды (`tasklist`).

**Что сделано:**
- ✅ Добавлена санитизация команд для безопасности
- ✅ Изолирована логика проверки процессов в отдельную функцию

**Рекомендации для кросс-платформенности:**

```typescript
// src/utils/processChecker.ts
export class ProcessChecker {
  private static getCommand(exeName: string): string {
    const platform = process.platform
    
    switch (platform) {
      case 'win32':
        return `tasklist /fi "IMAGENAME eq ${exeName}" /fo csv /nh`
      case 'darwin':
        return `ps aux | grep ${exeName}`
      case 'linux':
        return `ps aux | grep ${exeName}`
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  static async isRunning(exeName: string): Promise<boolean> {
    const sanitized = this.sanitize(exeName)
    const command = this.getCommand(sanitized)
    
    try {
      const { stdout } = await window.electronAPI.apps.execCommand(command)
      return this.parseOutput(stdout, process.platform)
    } catch {
      return false
    }
  }

  private static parseOutput(output: string, platform: string): boolean {
    switch (platform) {
      case 'win32':
        return output.includes(exeName) && !output.includes('Not Found')
      case 'darwin':
      case 'linux':
        const lines = output.split('\n')
        return lines.some(line => 
          line.includes(exeName) && !line.includes('grep')
        )
      default:
        return false
    }
  }

  private static sanitize(exeName: string): string {
    return exeName.replace(/[;&|`$()]/g, '')
  }
}
```

**Приоритет:** Средний  
**Сложность:** Низкая  
**Время:** 2-4 часа

---

### 2. Какой объем данных ожидается?

**Анализ текущей архитектуры:**

Текущая реализация хранит всё в localStorage:
- Apps: ~10-100 приложений × ~1KB = 10-100KB
- Todos: ~100-1000 задач × ~500B = 50-500KB
- Общий объем: ~100-600KB

**Ограничения localStorage:**
- Максимум: 5-10MB (зависит от браузера)
- Синхронный API (блокирует UI)
- Нет индексации

**Рекомендации по масштабированию:**

#### Для малых объемов (< 1MB)
✅ **Текущее решение подходит**
- localStorage + debounced sync
- Computed properties для фильтрации
- Pagination на UI

#### Для средних объемов (1-10MB)
⚠️ **Рекомендуется IndexedDB**

```typescript
// src/utils/storage/IndexedDBStorage.ts
import { openDB, DBSchema } from 'idb'

interface AppDB extends DBSchema {
  apps: {
    key: string
    value: UserAppWithDisplay
    indexes: { 'by-lastUsed': Date }
  }
  todos: {
    key: string
    value: UserTodoWithDisplay
    indexes: { 'by-dueDate': Date, 'by-completed': boolean }
  }
}

export class IndexedDBStorage {
  private db: Promise<IDBPDatabase<AppDB>>

  constructor() {
    this.db = openDB<AppDB>('yourspace-db', 1, {
      upgrade(db) {
        const appStore = db.createObjectStore('apps', { keyPath: 'id' })
        appStore.createIndex('by-lastUsed', 'lastUsed')

        const todoStore = db.createObjectStore('todos', { keyPath: 'id' })
        todoStore.createIndex('by-dueDate', 'dueDate')
        todoStore.createIndex('by-completed', 'completed')
      }
    })
  }

  async getApps(limit = 100, offset = 0) {
    const db = await this.db
    return db.getAllFromIndex('apps', 'by-lastUsed', null, limit)
  }

  async saveApp(app: UserAppWithDisplay) {
    const db = await this.db
    await db.put('apps', app)
  }
}
```

#### Для больших объемов (> 10MB)
🔥 **Требуется серверная пагинация**

```typescript
// server/services/AppService.ts
async getAllApps(userId: string, options: {
  limit?: number
  offset?: number
  sortBy?: 'lastUsed' | 'totalMinutes'
  order?: 'asc' | 'desc'
}) {
  const { limit = 50, offset = 0, sortBy = 'lastUsed', order = 'desc' } = options

  return appRepository.findAllByUserId(userId, {
    take: limit,
    skip: offset,
    orderBy: { [sortBy]: order }
  })
}
```

**Приоритет:** Высокий (если > 1000 записей)  
**Сложность:** Средняя  
**Время:** 1-2 дня

---

### 3. Нужна ли поддержка offline-режима для всех функций?

**Текущая реализация:**
✅ Offline-first подход уже реализован!

**Что работает offline:**
- ✅ Просмотр приложений
- ✅ Добавление/удаление приложений
- ✅ Отслеживание времени
- ✅ Управление todo-листами
- ✅ Создание/редактирование задач

**Что НЕ работает offline:**
- ❌ Синхронизация между устройствами
- ❌ Получение обновлений каталога
- ❌ Обновление профиля

**Рекомендации для улучшения offline-режима:**

#### 1. Conflict Resolution
```typescript
// src/stores/sync/ConflictResolver.ts
export class ConflictResolver {
  resolve<T extends { updatedAt: Date }>(
    local: T,
    remote: T,
    strategy: 'local-wins' | 'remote-wins' | 'last-write-wins' = 'last-write-wins'
  ): T {
    switch (strategy) {
      case 'local-wins':
        return local
      case 'remote-wins':
        return remote
      case 'last-write-wins':
        return local.updatedAt > remote.updatedAt ? local : remote
    }
  }
}
```

#### 2. Offline Queue
```typescript
// src/stores/sync/OfflineQueue.ts
export class OfflineQueue {
  private queue: Array<{
    id: string
    action: 'create' | 'update' | 'delete'
    entity: string
    data: any
    timestamp: Date
  }> = []

  add(action: string, entity: string, data: any) {
    this.queue.push({
      id: crypto.randomUUID(),
      action,
      entity,
      data,
      timestamp: new Date()
    })
    this.save()
  }

  async processQueue(token: string) {
    for (const item of this.queue) {
      try {
        await this.processItem(item, token)
        this.remove(item.id)
      } catch (error) {
        console.error('Failed to process queue item:', error)
        // Retry later
      }
    }
  }
}
```

#### 3. Service Worker для кеширования
```typescript
// public/sw.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        return caches.open('v1').then((cache) => {
          cache.put(event.request, response.clone())
          return response
        })
      })
    }).catch(() => {
      // Offline fallback
      return caches.match('/offline.html')
    })
  )
})
```

**Приоритет:** Средний  
**Сложность:** Средняя  
**Время:** 3-5 дней

---

### 4. Планируется ли multi-tenancy или это single-user приложение?

**Текущая архитектура:**
✅ **Multi-user ready!**

Уже реализовано:
- ✅ User model с уникальными ID
- ✅ Связи через userId
- ✅ JWT аутентификация
- ✅ Изоляция данных по пользователям

**Что уже работает:**
```typescript
// Каждый пользователь видит только свои данные
return prisma.userApp.findMany({
  where: { userId: user.id } // ✅ Изоляция
})
```

**Рекомендации для enterprise multi-tenancy:**

#### 1. Tenant Model
```typescript
// prisma/schema.prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  plan      String   // free, pro, enterprise
  maxUsers  Int      @default(5)
  
  users     User[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  // ...
}
```

#### 2. Tenant Context Middleware
```typescript
// server/middleware/tenant.ts
export async function getTenantContext(token: string) {
  const user = await authenticate(token)
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId }
  })
  
  return { user, tenant }
}

// Использование
ipcMain.handle('apps:getAll', async (event, token) => {
  const { user, tenant } = await getTenantContext(token)
  
  // Проверка лимитов
  if (tenant.plan === 'free' && apps.length >= 10) {
    throw new Error('Free plan limit reached')
  }
  
  return appService.getAllApps(user.id)
})
```

#### 3. Row Level Security (RLS)
```sql
-- PostgreSQL RLS
ALTER TABLE user_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_apps_isolation ON user_apps
  USING (user_id = current_setting('app.current_user_id')::text);
```

**Приоритет:** Низкий (если не требуется сейчас)  
**Сложность:** Средняя  
**Время:** 2-3 дня

---

### 5. Есть ли требования по GDPR/защите персональных данных?

**Текущее состояние:**
⚠️ **Частично соответствует**

**Что уже реализовано:**
- ✅ Хеширование паролей
- ✅ JWT токены с expiration
- ✅ Удаление пользователя (CASCADE)

**Что нужно добавить для GDPR:**

#### 1. Data Export (Right to Data Portability)
```typescript
// server/services/GDPRService.ts
export class GDPRService {
  async exportUserData(userId: string): Promise<{
    user: any
    apps: any[]
    todos: any[]
  }> {
    const [user, apps, todos] = await Promise.all([
      userRepository.findById(userId),
      appRepository.findAllByUserId(userId),
      todoRepository.findAllByUserId(userId)
    ])

    // Remove sensitive data
    const { password, ...userWithoutPassword } = user!

    return {
      user: userWithoutPassword,
      apps,
      todos,
      exportedAt: new Date().toISOString(),
      format: 'JSON'
    }
  }

  async exportToCSV(userId: string): Promise<string> {
    const data = await this.exportUserData(userId)
    // Convert to CSV
    return convertToCSV(data)
  }
}
```

#### 2. Data Deletion (Right to be Forgotten)
```typescript
// server/services/GDPRService.ts
async deleteUserData(userId: string, options: {
  keepAnonymized?: boolean
  deleteImmediately?: boolean
} = {}) {
  if (options.keepAnonymized) {
    // Anonymize instead of delete
    await userRepository.update(userId, {
      email: `deleted-${userId}@example.com`,
      name: 'Deleted User',
      password: 'DELETED'
    })
  } else if (options.deleteImmediately) {
    // Hard delete
    await userRepository.delete(userId)
  } else {
    // Soft delete (mark for deletion in 30 days)
    await userRepository.update(userId, {
      deletedAt: new Date(),
      scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
  }
}
```

#### 3. Consent Management
```typescript
// prisma/schema.prisma
model UserConsent {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  type      ConsentType // ANALYTICS, MARKETING, ESSENTIAL
  granted   Boolean
  grantedAt DateTime?
  revokedAt DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ConsentType {
  ANALYTICS
  MARKETING
  ESSENTIAL
}
```

#### 4. Audit Log
```typescript
// prisma/schema.prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // LOGIN, LOGOUT, DATA_EXPORT, DATA_DELETE
  ipAddress String?
  userAgent String?
  metadata  Json?
  
  createdAt DateTime @default(now())
}
```

#### 5. Privacy Policy & Terms
```typescript
// src/components/legal/PrivacyPolicy.vue
<template>
  <div class="privacy-policy">
    <h1>Privacy Policy</h1>
    <section>
      <h2>Data We Collect</h2>
      <ul>
        <li>Email address</li>
        <li>Application usage data</li>
        <li>Todo items</li>
      </ul>
    </section>
    <section>
      <h2>Your Rights</h2>
      <ul>
        <li>Right to access your data</li>
        <li>Right to delete your data</li>
        <li>Right to export your data</li>
      </ul>
    </section>
  </div>
</template>
```

**Приоритет:** Высокий (если в EU)  
**Сложность:** Средняя  
**Время:** 1 неделя

---

## 📊 Приоритизация

### Критично (сделать сейчас)
1. ✅ Безопасность (DONE)
2. ✅ Архитектура (DONE)
3. ✅ Тестирование (DONE)

### Высокий приоритет (1-2 недели)
1. GDPR compliance (если в EU)
2. Масштабирование данных (если > 1000 записей)
3. CI/CD pipeline

### Средний приоритет (1-2 месяца)
1. Кросс-платформенность (macOS/Linux)
2. Улучшенный offline-режим
3. Performance monitoring

### Низкий приоритет (3+ месяца)
1. Multi-tenancy (если не требуется)
2. GraphQL API
3. Микросервисы

---

## 🎯 Рекомендации

### Для production запуска:
1. ✅ Ротация секретов (.env)
2. ✅ Настройка логирования
3. ⚠️ GDPR compliance (если в EU)
4. ⚠️ Мониторинг (Sentry)
5. ⚠️ Backup стратегия

### Для масштабирования:
1. IndexedDB вместо localStorage
2. Серверная пагинация
3. Кеширование (Redis)
4. CDN для статики

### Для enterprise:
1. Multi-tenancy
2. SSO интеграция
3. Audit logging
4. SLA мониторинг

---

## 📞 Контакты

Если есть дополнительные вопросы по архитектуре или требованиям, обращайтесь!

**Документация:**
- REFACTORING.md
- MIGRATION_GUIDE.md
- SUMMARY.md
