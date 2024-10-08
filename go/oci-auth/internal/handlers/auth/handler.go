package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pluralsh/console/go/oci-auth/internal/router"
)

func init() {
	router.RootGroup().POST("/auth", handleAuth)
}

func handleAuth(c *gin.Context) {
	request := new(AuthenticationRequest)
	if err := c.Bind(request); err != nil {
		c.JSON(http.StatusBadRequest, err)
		return
	}

	response, err := authenticate(c.Request.Context(), request)
	if err != nil {
		c.String(http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}
