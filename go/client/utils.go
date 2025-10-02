package client

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/Yamashou/gqlgenc/clientv2"
)

func HashQuery(query string) string {
	hash := sha256.New()
	hash.Write([]byte(query))
	return "sha256:" + hex.EncodeToString(hash.Sum(nil))
}

func PersistedQueryInterceptor(ctx context.Context, req *http.Request, gqlInfo *clientv2.GQLRequestInfo, res any, next clientv2.RequestInterceptorFunc) error {
	if strings.HasPrefix(req.Header.Get("Content-Type"), "multipart/form-data") {
		return next(ctx, req, gqlInfo, res)
	}

	q := gqlInfo.Request.Query
	hash := HashQuery(q)
	newBody := map[string]any{
		"query":         q,
		"variables":     gqlInfo.Request.Variables,
		"operationName": gqlInfo.Request.OperationName,
		"extensions": map[string]any{
			"persistedQuery": map[string]any{
				"sha256Hash": hash,
			},
		},
	}
	newBodyBytes, err := json.Marshal(newBody)
	if err != nil {
		return err
	}
	req.Body = io.NopCloser(bytes.NewBuffer(newBodyBytes))

	return next(ctx, req, gqlInfo, res)
}
