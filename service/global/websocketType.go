package global

const (
	WEBSOCKET_TYPE_MESSAGE        = "websocket_type_message"        // 处理电报用户消息
	WEBSOCKET_TYPE_HEART          = "websocket_type_heart"          // 服务端接收处理心跳消息
	WEBSOCKET_TYPE_HEART_CALLBACK = "websocket_type_heart_callback" // 客户端处理心跳消息回调
	WEBSOCKET_TYPE_ERROR          = "websocket_type_error"          // 错误处理
)
