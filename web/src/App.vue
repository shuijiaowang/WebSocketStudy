<script setup>
import { RouterView } from 'vue-router'
import {onMounted} from "vue";
import {useUserStore} from "@/stores/user.js";
const userStore=useUserStore()
onMounted(() => {
  userStore.parseTokenAndSetUserInfo()
})
</script>

<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
}
</style>