
import { useStorage } from '@vueuse/core'
export default class WebSocketUtil {
    // 去掉#，使用普通属性
    uuid;
    socket;
    eventHandlers;

    constructor(uuid) {
        this.uuid = uuid;
        this.socket = null;
        this.eventHandlers = {};
    }

    /** 初始化WebSocket连接 */
    connect() {
        const token = useStorage('token', '')
        console.log("token:",token)
        const url = `ws://localhost:7789/api/websocket/test?token=${token.value}`; // 本地
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('WebSocket连接已建立');
            this.triggerEvent('open');
        };

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // 先触发特定类型事件
                this.triggerEvent(message.type, message);
                // 再触发一个通用的message事件
                this.triggerEvent('message', message);
            } catch (error) {
                console.error('解析消息失败:', error);
                this.triggerEvent('parseError', event.data);
            }
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket连接已关闭:', event);
            this.triggerEvent('close', event);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket发生错误:', error);
            this.triggerEvent('error', error);
        };
    }

    /** 关闭WebSocket连接 */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            console.log('WebSocket连接已手动关闭');
        }
    }

    /** 发送消息到后端 */
    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('WebSocket未连接，无法发送消息:', message);
        }
    }

    /** 添加自定义事件监听 */
    on(type, handler) {
        if (!this.eventHandlers[type]) {
            this.eventHandlers[type] = [];
        }
        this.eventHandlers[type].push(handler);
    }

    /** 移除事件监听 */
    off(type, handler) {
        if (!this.eventHandlers[type]) return;

        if (handler) {
            this.eventHandlers[type] = this.eventHandlers[type].filter(
                (h) => h !== handler
            );
        } else {
            this.eventHandlers[type] = [];
        }
    }

    /** 触发事件（去掉#，改为普通方法） */
    triggerEvent(type, data) {
        const handlers = this.eventHandlers[type];
        if (handlers) {
            handlers.forEach((handler) => handler(data));
        }
    }
}