package router

import (
	"context"
	"fmt"

	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// oauthAccessToken returns a bearer credential from OAuth2 client-credentials exchange when
// enabled, otherwise an empty string. providerName is used in validation error messages.
func (in *Account) oauthAccessToken(ctx context.Context, tx *pb.OpenAiTokenExchange, providerName string) (string, error) {
	if tx == nil || !tx.GetEnabled() {
		return "", nil
	}

	tokenURL := tx.GetTokenUrl()
	clientID := tx.GetClientId()
	clientSecret := tx.GetClientSecret()
	if tokenURL == "" || clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("%s tokenExchange enabled but tokenUrl, clientId, and clientSecret must all be set", providerName)
	}

	return in.tokenCache.AccessToken(ctx, tokenURL, clientID, clientSecret)
}
