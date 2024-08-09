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
	request := new(AuthenticationRequest)
	if err := c.Bind(request); err != nil {
		c.JSON(http.StatusBadRequest, err)
		return
	}

	response, err := authenticate(request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, err)
	}

	c.JSON(http.StatusOK, response)
}
