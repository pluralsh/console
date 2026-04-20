package api

import (
	"errors"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

var (
	ErrUnsupportedProxyJWTToken = errors.New("unsupported proxy token format")
)

type proxyJWTClaims struct {
	jwt.RegisteredClaims

	Email  string   `json:"user.email"`
	Groups []string `json:"groups"`
}

type JWTProxyAuthorizer struct {
	log    *zap.Logger
	secret []byte
}

func NewJWTProxyAuthorizer(logger *zap.Logger, secret []byte) *JWTProxyAuthorizer {
	if len(secret) == 0 {
		return nil
	}

	return &JWTProxyAuthorizer{log: logger, secret: secret}
}

func (a *JWTProxyAuthorizer) Authorize(token string) (*AuthorizeProxyUserResponse, error) {
	// A quick format check avoids expensive parser work for non-JWT opaque tokens.
	if strings.Count(token, ".") != 2 {
		return nil, ErrUnsupportedProxyJWTToken
	}

	claims := &proxyJWTClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}

		return a.secret, nil
	}, jwt.WithValidMethods([]string{"HS256", "HS384", "HS512"}))
	if err != nil {
		return nil, fmt.Errorf("could not parse jwt: %w", err)
	}

	userID := strings.TrimPrefix(claims.Subject, "user:")
	email := claims.Email
	if userID == "" || email == "" {
		return nil, fmt.Errorf("required user claims are missing")
	}

	a.log.Debug("authorized proxy user",
		zap.String("user_id", userID),
		zap.String("email", email),
		zap.Strings("groups", claims.Groups),
	)

	return &AuthorizeProxyUserResponse{
		User: &User{
			Id:       userID,
			Username: email,
			Email:    email,
		},
		AccessAs: &AccessAsProxyAuthorization{
			AccessAs: &AccessAsProxyAuthorization_User{
				User: &AccessAsUserAuthorization{
					Groups: claims.Groups,
				},
			},
		},
	}, nil
}
