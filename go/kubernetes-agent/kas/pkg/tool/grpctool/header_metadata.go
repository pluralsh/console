package grpctool

import (
	"context"
	"net/http"
	"strings"

	"google.golang.org/grpc/credentials"
)

func NewHeaderMetadata(header http.Header, insecure bool) credentials.PerRPCCredentials {
	m := make(map[string]string, len(header))
	for k, v := range header {
		m[k] = strings.Join(v, ",")
	}
	return &headerMetadata{
		header:   m,
		insecure: insecure,
	}
}

type headerMetadata struct {
	header   map[string]string
	insecure bool
}

func (h *headerMetadata) GetRequestMetadata(ctx context.Context, uri ...string) (map[string]string, error) {
	return h.header, nil
}

func (h *headerMetadata) RequireTransportSecurity() bool {
	return !h.insecure
}
