<script setup lang="ts">
import EmailCard from '@/components/views/InboxView/EmailCard.vue'
import { ref, onMounted } from 'vue'

const emails = [
  {
    from: 'alice@wonderland.io',
    subject: 'Meeting tomorrow',
    preview: 'Hey, can we reschedule the meeting to 3pm?',
    to_which: "test1@gmail.com",
    time: '10:30',
    read: false,
    important: true,
    avatar: 'A'
  },
  {
    from: 'github@github.com',
    subject: 'Your repository has a new issue',
    preview: 'Issue #42: Bug in login component',
    to_which: "test2@gmail.com",
    time: '09:15',
    read: false,
    important: false,
    avatar: 'G'
  },
  {
    from: 'newsletter@design.so',
    subject: 'Weekly design inspiration',
    preview: 'Check out these 10 amazing UI designs',
    to_which: "test@gmail.com",
    time: 'вчера',
    read: true,
    important: false,
    avatar: 'D'
  },
  {
    from: 'boss@company.com',
    subject: '🔥 Urgent: Project deadline',
    preview: 'We need to finish this by Friday',
    to_which: "test@gmail.com",
    time: '11:45',
    read: false,
    important: true,
    avatar: 'B'
  },
  {
    from: 'spotify@mail.com',
    subject: 'Discover Weekly is ready',
    preview: 'New playlist based on your listening',
    to_which: "test@gmail.com",
    time: '08:20',
    read: true,
    important: false,
    avatar: 'S'
  }
]

const visibleEmails = ref<typeof emails>([])
const loaded = ref(false)

onMounted(() => {
  emails.forEach((email, index) => {
    setTimeout(() => {
      visibleEmails.value.push(email)
      if (index === emails.length - 1) {
        loaded.value = true
      }
    }, index * 350)
  })
})

</script>

<template>
  <div class="email-list">
    <TransitionGroup 
      name="email" 
      tag="div" 
      class="email-list"
    >
      <div 
        v-for="email in visibleEmails" 
        :key="email.time + email.from"
        class="email-wrapper"
      >
        <EmailCard v-bind="email" />
      </div>
    </TransitionGroup>

    <div v-if="!loaded" class="loading-skeleton">
      <div v-for="n in 3" :key="n" class="skeleton-card"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.email-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  min-height: 200px;
}

.email-wrapper {
  width: 100%;
}

.email-enter-active {
  transition: all .3s ease-out;
  transition-delay: calc(.05s * var(--index));
}

.email-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.email-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-card {
  height: 96px;
  background: linear-gradient(90deg, 
    rgba(255,255,255,.05) 25%, 
    rgba(255,255,255,.1) 50%, 
    rgba(255,255,255,.05) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 12px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>