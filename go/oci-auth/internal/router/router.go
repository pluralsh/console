package router

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pluralsh/console/go/oci-auth/internal/args"
	"k8s.io/klog/v2"
)

var (
	router    *gin.Engine
	rootGroup *gin.RouterGroup
)

func init() {
	router = gin.Default()
	_ = router.SetTrustedProxies(nil)
	router.Use(authMiddleware())

	rootGroup = router.Group("/")
}

func authMiddleware() gin.HandlerFunc {
	if args.Token() == "" {
		klog.Fatal("Auth token value is missing")
	}

	return func(c *gin.Context) {
		tokenHeader := c.GetHeader("Authorization")
		splitToken := strings.Split(tokenHeader, "Token")
		if len(splitToken) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := strings.TrimSpace(splitToken[1])
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			c.Abort()
			return
		}

		if token != args.Token() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Next()
	}

}

func Router() *gin.Engine {
	return router
}

func RootGroup() *gin.RouterGroup {
	return rootGroup
}
