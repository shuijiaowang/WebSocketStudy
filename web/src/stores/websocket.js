import { defineStore } from 'pinia';
import {ref, onUnmounted, onMounted} from 'vue';
import {ElMessage} from "element-plus";
import {useUserStore} from "@/stores/user.js";
import WebSocketUtil from "@/utils/websocketUtil.js";
export const useWsStore = defineStore('ws', () => {
    
    const ws = ref(null); //websocket实例
    const isConnected = ref(false); //连接状态
    const messages = ref([]); //消息，这个有什么用
    // 专门存储未接收的消息
    const notReceivedMessages = ref([]);
    const userStore = useUserStore();//用户信息

    // 处理连接成功
    const handleOpen = () => {
        console.log('WebSocket连接成功');
        isConnected.value = true;
    };

    // 处理接收到的消息
    const handleMessage = (message) => {
        console.log('收到WebSocket消息:', message);
        messages.value.push(message); // 保留：存储原始消息

        // 若为「未接收消息」，发布事件给订阅者（如 pendingChatStore）
        if(message.type === 'websocket_type_message'){ //客服收到消息
            console.log("收到普通消息")
        }
        if(message.type === 'websocket_type_heart'){
            // 收到心跳包，重置丢失计数
            heartBeatLostCount.value = 0;
            if (heartBeatAckTimer.value) {
                clearTimeout(heartBeatAckTimer.value);
                heartBeatAckTimer.value = null;
            }
        }
    };
    // 处理连接关闭
    const handleClose = () => {
        console.log('WebSocket连接关闭');
        isConnected.value = false;
    };

    // 处理错误
    const handleError = (error) => {
        console.error('WebSocket错误:', error);
        isConnected.value = false;
    };

    // 初始化WebSocket连接
    const initWebSocket = () => {
        console.log("初始化WebSocket连接")
        // 先关闭已有连接
        if (ws.value) {
            closeWebSocket();
        }
        // 检查用户UUID是否存在
        if (userStore.userInfo?.uuid) {
            ws.value = new WebSocketUtil(userStore.userInfo.uuid);
            // 注册事件处理
            ws.value.on('open', handleOpen);
            ws.value.on('message', handleMessage);
            ws.value.on('close', handleClose);
            ws.value.on('error', handleError);
            // 建立连接
            ws.value.connect();
            //初始化连接时才启动发送心跳包
            heartBeatTimer = setInterval(sendHeartBeat, 20000);
        } else {
            console.error('用户UUID不存在，无法初始化WebSocket');
        }
    };

    // 关闭WebSocket连接// 清理定时器
    const closeWebSocket = () => {
        //清理定时器
        if (heartBeatTimer) {
            clearInterval(heartBeatTimer);
            heartBeatTimer = null;
        }
        if (ws.value) {
            // 移除事件监听
            ws.value.off('open', handleOpen);
            ws.value.off('message', handleMessage);
            ws.value.off('close', handleClose);
            ws.value.off('error', handleError);
            // 关闭连接
            ws.value.disconnect();
            ws.value = null;
            isConnected.value = false;
        }
    };

    // 发送消息
    const sendMessage = (message) => {
        if (ws.value && isConnected.value) {
            console.log('发送WebSocket消息:', message);
            ws.value.sendMessage(message);
        } else {
            console.error('WebSocket未连接，无法发送消息');
        }
    };


    // 组件挂载时订阅事件
    onMounted(() => {
        console.log("wsStorePinia挂载")
    });

    // 组件卸载时取消订阅（避免内存泄漏）
    onUnmounted(() => {
        closeWebSocket();
    });

    // 保存定时器ID
    let heartBeatTimer = null;
// 新增：心跳丢失计数
    const heartBeatLostCount = ref(0);
// 新增：心跳超时定时器
    const heartBeatAckTimer = ref(null);
// 发送心跳包函数
    const sendHeartBeat = () => {
        if (ws.value && isConnected.value) {
            sendMessage({
                type: "websocket_type_heart",
                data: { timestamp: Date.now() }
            });
            console.log('发送心跳包');
        }
        // 等待后端心跳响应
        heartBeatAckTimer.value = setTimeout(() => {
            heartBeatLostCount.value += 1;
            console.warn(`心跳包未收到响应，丢失次数：${heartBeatLostCount.value}`);
            //写一个elment提示窗口
            ElMessage.warning('连接断开,请刷新页面重试');

            if (heartBeatLostCount.value >= 2) {
                console.error('连续2次心跳丢失，判定连接断开，尝试重连');
                closeWebSocket();
                initWebSocket();
                heartBeatLostCount.value = 0; // 重置计数
            }
        }, 5000); // 10秒超时
    };


    // 暴露状态和方法
    return {
        ws,
        isConnected,
        messages,
        notReceivedMessages,
        initWebSocket,
        closeWebSocket,
        sendMessage
    };
});
