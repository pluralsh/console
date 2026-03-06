package grpctool

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	jwtValidFor  = 5 * time.Second
	jwtNotBefore = 5 * time.Second
)

type JwtCredentials struct {
	Secret   []byte
	Audience string
	Issuer   string
	Insecure bool
}

func (c *JwtCredentials) GetRequestMetadata(ctx context.Context, uri ...string) (map[string]string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    c.Issuer,
		Audience:  jwt.ClaimStrings{c.Audience},
		ExpiresAt: jwt.NewNumericDate(now.Add(jwtValidFor)),
		NotBefore: jwt.NewNumericDate(now.Add(-jwtNotBefore)),
		IssuedAt:  jwt.NewNumericDate(now),
	}
	signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
		SignedString(c.Secret)
	if err != nil {
		return nil, err
	}
	return map[string]string{
		MetadataAuthorization: "Bearer " + signedClaims,
	}, nil
}

func (c *JwtCredentials) RequireTransportSecurity() bool {
	return !c.Insecure
}
