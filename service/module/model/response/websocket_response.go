package response

type WebsocketResponse struct {
	Code      int    `json:"code"`      // 状态码  //200为成功，1000为失败
	Type      string `json:"type"`      // 消息类型
	Data      any    `json:"data"`      // 业务数据
	Msg       string `json:"msg"`       // 消息说明
	Timestamp string `json:"timestamp"` // 时间戳
}

func (WebsocketResponse) GetTypeName() string {
	return "WebsocketResponse"
}
