<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import SidebarNav from './SidebarNav.vue'
import TopBar from './TopBar.vue'
import MobileTabBar from './MobileTabBar.vue'

const ui = useUiStore()
</script>

<template>
  <div class="shell" :class="{ 'is-collapsed': ui.sidebarCollapsed, 'is-mobile': ui.isMobile }">
    <SidebarNav v-if="!ui.isMobile" class="shell__side" />
    <div class="shell__main">
      <TopBar />
      <div class="shell__content">
        <RouterView v-slot="{ Component }">
          <Transition name="rise" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </div>
    <MobileTabBar v-if="ui.isMobile" />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background: var(--bg);
}
.shell__side {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  z-index: var(--z-nav);
  transition: transform 0.3s var(--ease);
}
.is-collapsed .shell__side {
  transform: translateX(-102%);
}
.shell__main {
  margin-left: var(--sidebar-w);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s var(--ease);
}
.is-collapsed .shell__main {
  margin-left: 0;
}
.shell__content {
  flex: 1 1 auto;
  width: 100%;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 24px 28px 56px;
}
.is-mobile .shell__content {
  padding: 16px 16px calc(var(--tabbar-h) + 26px);
}
.is-mobile .shell__main {
  margin-left: 0;
}
@media (max-width: 980px) {
  .shell__content { padding: 16px 16px 40px; }
}
</style>