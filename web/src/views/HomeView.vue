<template>
  <div>
    <button @click.stop="getHttpResponseHandler">点击测试HTTP</button>
    <span>{{ httpResponse }}</span>
  </div>
  <div>
    <button @click.stop="getWebsocketResponseHandler">点击测试Websocket</button>
    <span>{{ websocketResponse }}</span>
  </div>

</template>
<script setup>
import {ref,onMounted} from "vue";
import {text} from "@/api/example.js";
import {useWsStore} from "@/stores/websocket.js";
const wsStore=useWsStore()

const httpResponse = ref(null)
httpResponse.value = 111

const getHttpResponseHandler = async () => {
  const res = await text({})
  httpResponse.value = res.data
}
const getWebsocketResponseHandler = () => {
  const message = {
    type: "websocket_type_message",
    data: {
      message: "消息内容"
    }
  }
  wsStore.sendMessage(message)
}
onMounted(() => {
    wsStore.initWebSocket()
})
</script>