package api

import (
	"SService/global"
	"SService/module/model"
	"SService/module/model/response"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var GlobalWebSocketApi *WebSocketApi

type WebSocketApi struct {
	UserNode sync.Map // 存放客服Node实例 key为用户uuid value为Node实例
}

func InitWebSocketApi() *WebSocketApi {
	api := &WebSocketApi{
		UserNode: sync.Map{},
	}
	GlobalWebSocketApi = api // 赋值给全局变量
	return api
}

type Node struct {
	Conn *websocket.Conn //websocket实例
	//并行转串行 Conn是IO型数据 大量IO并行的话容易乱 串行数据能保证数据顺序 同时默认缓存256个数据
	DataQueue chan []byte
	// 该节点的用户信息 //也就是客服
	User *model.User
	// 并发控制
	ctx    context.Context    // 控制协程生命周期 //上下文控制生命周期
	cancel context.CancelFunc // 终止函数
}

// NewNode 创建新Node
func NewNode(conn *websocket.Conn, user *model.User) *Node {
	ctx, cancel := context.WithCancel(context.Background())
	return &Node{
		Conn:      conn,
		User:      user,
		DataQueue: make(chan []byte, 256),
		ctx:       ctx,
		cancel:    cancel,
	}
}

func (w *WebSocketApi) Test(c *gin.Context, writer http.ResponseWriter, request *http.Request) {
	// 获取路径上的参数
	query := request.URL.Query()
	LoginUUID := query.Get("uuid")
	slog.Info("正在连接websocket", "[uuid]:", LoginUUID)
	// 创建并升级连接
	conn, err := (&websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}).Upgrade(writer, request, nil)
	if err != nil {
		slog.Error("websocket upgrade failed", err)
		return
	}
	// 获取客服信息
	uuidFromString, err := uuid.Parse(LoginUUID)
	if err != nil {
		slog.Error("错误的uuid")
		return
	}
	user, err := userService.GetUserInfo(uuidFromString)
	if err != nil {
		slog.Error("建立websocket中，获取user信息失败", err)
		return
	}
	// 创建Node节点
	node := NewNode(conn, user)

	// 设置连接关闭处理器
	conn.SetCloseHandler(func(code int, text string) error {
		// 清理会话
		w.UserNode.Delete(node.User.UUID)
		// 终止接收和发送协程
		node.cancel()
		slog.Info("websocket断开", "[username]", node.User.Username, "[uuid]", node.User.UUID)
		return nil
	})
	// 添加节点
	w.UserNode.Store(node.User.UUID, node)

	// 启动发送和接收消息的协程
	go w.SendProc(node) //后端 → 前端
	go w.RecProc(node)  //前端 → 后端
	slog.Info("创建websocket成功 用户会话已添加", "[username]", node.User.Username, "[uuid]", node.User.UUID)
}

// 后端 → 前端
func (w *WebSocketApi) SendProc(node *Node) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("Websocket发送失败")
		}
	}()

	for {
		select {
		case data := <-node.DataQueue: //用户消息发给节点user，客服，前端
			if err := node.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
				slog.Error("发送给客服消息失败", err)
			}

		case <-node.ctx.Done(): // 接收到退出信号
			slog.Info("这啥，系统结束，关闭websocket")
			return
		}
	}
}

// 前端 → 后端
func (w *WebSocketApi) RecProc(node *Node) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("结束websocket中出现错误-pinia")
		}
	}()

	for {
		select {
		case <-node.ctx.Done():
			slog.Info("收到退出信号，关闭websocket")
			return

		default:
			_, data, err := node.Conn.ReadMessage() // 读取前端数据
			if err != nil {
				// 处理正常关闭错误
				if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					slog.Info("websocket连接正常关闭", err)
				} else {
					slog.Error("读取websocket的消息失败", err)
				}
				return
			}
			//处理websocket消息
			w.dispatch(data, node)
		}
	}
}
func (w *WebSocketApi) dispatch(data []byte, node *Node) {
	// 解析data为WebsocketResponse
	msg := new(response.WebsocketResponse)
	err := json.Unmarshal(data, msg)
	if err != nil {
		slog.Error("unmarshal json failed", err.Error())
		return
	}

	switch msg.Type {
	//
	case global.WEBSOCKET_TYPE_MESSAGE:
		w.HandleBaseMessage(msg, node)
	//  处理心跳消息
	case global.WEBSOCKET_TYPE_HEART:
		w.handleHeart(msg, node)
	default:
		slog.Error("未知websocket类型")
	}
}
func (w *WebSocketApi) HandleBaseMessage(req *response.WebsocketResponse, node *Node) {
	marshal, err := json.Marshal(req)
	if err != nil {
		slog.Error("json.Marshal failed", err)
		return
	}
	node.DataQueue <- marshal
}
func (w *WebSocketApi) handleHeart(req *response.WebsocketResponse, node *Node) {
	slog.Info("能收到心跳吗")
	// 接收到心跳消息
	w.HandleBaseMessage(req, node)
	//w.HandleBaseMessage(&response.WebsocketResponse{
	//	Type: global.WEBSOCKET_TYPE_ERROR,
	//	Data: 123,
	//}, node)
}
