package client

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	ddtrace "github.com/DataDog/dd-trace-go/v2/ddtrace/tracer"
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

// DatadogTracingInterceptor creates a Datadog tracer for GraphQL operations.
func DatadogTracingInterceptor(ctx context.Context, req *http.Request, gqlInfo *clientv2.GQLRequestInfo, res any, next clientv2.RequestInterceptorFunc) error {
	span, ctx := ddtrace.StartSpanFromContext(ctx, "graphql.query",
		ddtrace.ResourceName(gqlInfo.Request.OperationName),
		ddtrace.SpanType("graphql"),
	)
	defer span.Finish()

	span.SetTag("graphql.operation.name", gqlInfo.Request.OperationName)
	span.SetTag("graphql.query", gqlInfo.Request.Query)
	span.SetTag("http.method", req.Method)
	span.SetTag("http.url", req.URL.String())

	err := next(ctx, req, gqlInfo, res)

	if err != nil {
		span.SetTag("error", true)
		span.SetTag("error.msg", err.Error())
	}

	return err
}

func GeneratePersistedQueries() map[string]string {
	result := map[string]string{}
	for doc, _ := range DocumentOperationNames {
		hash := HashQuery(doc)
		result[hash] = doc
	}

	return result
}
