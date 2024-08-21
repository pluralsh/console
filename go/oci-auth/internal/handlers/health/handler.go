package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pluralsh/console/go/oci-auth/internal/router"
)

func init() {
	router.Router().GET("/health", handleHealth)
}

func handleHealth(c *gin.Context) {
	c.String(http.StatusOK, "OK")
}
