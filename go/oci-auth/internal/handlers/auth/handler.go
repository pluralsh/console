package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pluralsh/console/go/oci-auth/internal/router"
)

func init() {
	router.RootGroup().GET("/auth", handleAuth)
}

func handleAuth(c *gin.Context) {
	c.JSON(http.StatusOK, "TODO")
}
