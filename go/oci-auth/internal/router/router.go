package router

import (
	"github.com/gin-gonic/gin"
)

var (
	router    *gin.Engine
	rootGroup *gin.RouterGroup
)

func init() {
	router = gin.Default()
	_ = router.SetTrustedProxies(nil)

	rootGroup = router.Group("/")
}

func Router() *gin.Engine {
	return router
}

func RootGroup() *gin.RouterGroup {
	return rootGroup
}
