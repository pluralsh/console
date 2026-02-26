// Package mock_stdlib contains Go standard library mocks
package mock_stdlib

import "net/http"

//go:generate mockgen.sh -destination "net_http_custom.go" -package "mock_stdlib" "github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_stdlib" "ResponseWriterFlusher"

//go:generate mockgen.sh -destination "net.go" -package "mock_stdlib" "net" "Conn"

//go:generate mockgen.sh -destination "net_http.go" -package "mock_stdlib" "net/http" "RoundTripper"

type ResponseWriterFlusher interface {
	http.ResponseWriter
	http.Flusher
	http.Hijacker
}
