package router

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/pluralsh/console/go/oci-auth/internal/args"
	"github.com/pluralsh/console/go/oci-auth/internal/environment"
	"k8s.io/klog/v2"
)

var (
	router    *gin.Engine
	rootGroup *gin.RouterGroup
)

func init() {
	if !environment.IsDev() {
		gin.SetMode(gin.ReleaseMode)
	}

	router = gin.Default()
	_ = router.SetTrustedProxies(nil)

	rootGroup = router.Group("/")
	rootGroup.Use(authMiddleware())
}

func authMiddleware() gin.HandlerFunc {
	if args.TokenFile() == "" {
		klog.Fatal("Auth token file is not specified")
	}

	return func(c *gin.Context) {
		requestHeaderToken := c.GetHeader("Authorization")
		splitRequestHeaderToken := strings.Split(requestHeaderToken, "Token")
		if len(splitRequestHeaderToken) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		requestToken := strings.TrimSpace(splitRequestHeaderToken[1])
		if requestToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			c.Abort()
			return
		}

		token, err := os.ReadFile(args.TokenFile())
		if err != nil {
			klog.Error("Could not read token file, got error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not read token file"})
			c.Abort()
			return
		}

		if requestToken != string(token) {
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
