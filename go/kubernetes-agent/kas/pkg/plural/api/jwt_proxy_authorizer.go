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
	ID         string   `json:"id"`
	Email      string   `json:"email"`
	Username   string   `json:"username"`
	Groups     []string `json:"groups"`
	BoundRoles []string `json:"bound_roles"`
	Roles      []string `json:"roles"`
	ClusterID  string   `json:"cluster_id"`
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

func (a *JWTProxyAuthorizer) Authorize(token, clusterID string) (*AuthorizeProxyUserResponse, error) {
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
	if claims.ClusterID != "" && claims.ClusterID != clusterID {
		return nil, fmt.Errorf("cluster_id claim does not match access token prefix")
	}

	userID := firstNonEmpty(claims.ID, claims.Subject)
	username := firstNonEmpty(claims.Username, claims.Email, claims.Subject)
	email := firstNonEmpty(claims.Email, claims.Username, claims.Subject)
	if userID == "" || username == "" || email == "" {
		return nil, fmt.Errorf("required user claims are missing")
	}
	roles := claims.BoundRoles
	if len(roles) == 0 {
		roles = claims.Roles
	}

	a.log.Debug("authorized proxy user",
		zap.String("user_id", userID),
		zap.String("username", username),
		zap.String("email", email),
		zap.Strings("roles", roles),
		zap.Strings("groups", claims.Groups),
	)

	return &AuthorizeProxyUserResponse{
		User: &User{
			Id:       userID,
			Username: username,
			Email:    email,
		},
		AccessAs: &AccessAsProxyAuthorization{
			AccessAs: &AccessAsProxyAuthorization_User{
				User: &AccessAsUserAuthorization{
					Roles:  roles,
					Groups: claims.Groups,
				},
			},
		},
	}, nil
}

func firstNonEmpty(candidates ...string) string {
	for _, candidate := range candidates {
		if candidate != "" {
			return candidate
		}
	}
	return ""
}
