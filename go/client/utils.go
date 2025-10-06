package client

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	"github.com/Yamashou/gqlgenc/clientv2"
)

func HashQuery(query string) string {
	hash := sha256.New()
	hash.Write([]byte(query))
	return "sha256:" + hex.EncodeToString(hash.Sum(nil))
}

func PersistedQueryInterceptor(ctx context.Context, req *http.Request, gqlInfo *clientv2.GQLRequestInfo, res any, next clientv2.RequestInterceptorFunc) error {
	hash := HashQuery(gqlInfo.Request.Query)
	query := req.URL.Query()
	query.Set("documentId", hash)
	req.URL.RawQuery = query.Encode()
	return next(ctx, req, gqlInfo, res)
}

func GeneratePersistedQueries() map[string]string {
	result := map[string]string{}
	for doc, _ := range DocumentOperationNames {
		hash := HashQuery(doc)
		result[hash] = doc
	}

	return result
}
