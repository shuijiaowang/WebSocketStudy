package util

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWT密钥（实际项目中建议从环境变量读取）
var jwtSecret = []byte("your-secret-key")

// 自定义claims
type Claims struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	UUID     string `json:"uuid"`
	jwt.RegisteredClaims
}

// 生成JWT令牌
func GenerateToken(userID int, username string, userUUID string) (string, error) {
	// 设置过期时间（例如24小时）
	expirationTime := time.Now().Add(240 * time.Hour)

	claims := &Claims{
		ID:       userID,
		Username: username,
		UUID:     userUUID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "SService",
		},
	}

	// 创建token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// 解析JWT令牌
func ParseToken(tokenString string) (*Claims, error) {
	// 解析token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	// 验证token并提取claims
	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func GetUserInfo(c *gin.Context) *Claims {
	claims, exists := c.Get("claims")
	if !exists {
		return nil
	}
	return claims.(*Claims)
}
