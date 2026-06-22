package client

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/99designs/gqlgen/graphql"
	"github.com/Yamashou/gqlgenc/clientv2"
)

func TestCreateAgentRunUploadUsesMultipartVariables(t *testing.T) {
	tests := []struct {
		name           string
		persistedQuery bool
	}{
		{name: "without persisted query"},
		{name: "with persisted query", persistedQuery: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			httpClient := &uploadHTTPClient{t: t}
			interceptors := []clientv2.RequestInterceptor{}
			if tt.persistedQuery {
				httpClient.wantDocumentID = HashQuery(CreateAgentRunUploadDocument)
				interceptors = append(interceptors, PersistedQueryInterceptor)
			}

			client := NewClient(httpClient, "http://console.test/graphql", nil, interceptors...)
			session := &graphql.Upload{
				File:        bytes.NewReader([]byte("session")),
				Filename:    "agent-session.tar.gz",
				Size:        int64(len("session")),
				ContentType: "application/gzip",
			}
			patch := &graphql.Upload{
				File:        bytes.NewReader([]byte("patch")),
				Filename:    "changes.patch",
				Size:        int64(len("patch")),
				ContentType: "text/x-patch",
			}

			res, err := client.CreateAgentRunUpload(context.Background(), "run-id", session, nil, patch)
			if err != nil {
				t.Fatalf("CreateAgentRunUpload returned error: %v", err)
			}
			if got := res.GetCreateAgentRunUpload().GetID(); got != "upload-id" {
				t.Fatalf("expected upload-id response, got %q", got)
			}
		})
	}
}

type uploadHTTPClient struct {
	t              *testing.T
	wantDocumentID string
}

func (c *uploadHTTPClient) Do(r *http.Request) (*http.Response, error) {
	c.t.Helper()

	if got, want := r.Header.Get("Content-Type"), "multipart/form-data"; !bytes.Contains([]byte(got), []byte(want)) {
		c.t.Fatalf("expected multipart request content type to contain %q, got %q", want, got)
	}
	if got := r.URL.Query().Get("documentId"); got != c.wantDocumentID {
		c.t.Fatalf("expected documentId %q, got %q", c.wantDocumentID, got)
	}
	if err := r.ParseMultipartForm(1024 * 1024); err != nil {
		c.t.Fatalf("failed to parse multipart form: %v", err)
	}
	c.assertGraphQLMultipart(r)
	if _, ok := r.MultipartForm.File["0"]; !ok {
		c.t.Fatal("expected session file part")
	}
	if _, ok := r.MultipartForm.File["1"]; !ok {
		c.t.Fatal("expected patch file part")
	}

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(bytes.NewBufferString(`{"data":{"createAgentRunUpload":{"id":"upload-id","session":"session-url","screenRecording":null,"patch":"patch-url"}}}`)),
	}, nil
}

func (c *uploadHTTPClient) assertGraphQLMultipart(r *http.Request) {
	c.t.Helper()

	var operations struct {
		Variables map[string]any `json:"variables"`
	}
	if err := json.Unmarshal([]byte(r.FormValue("operations")), &operations); err != nil {
		c.t.Fatalf("failed to unmarshal operations: %v", err)
	}
	if got := operations.Variables["runId"]; got != "run-id" {
		c.t.Fatalf("expected runId variable to remain %q, got %v", "run-id", got)
	}
	if operations.Variables["session"] != nil {
		c.t.Fatalf("expected session variable to be nulled for multipart mapping, got %v", operations.Variables["session"])
	}
	if operations.Variables["patch"] != nil {
		c.t.Fatalf("expected patch variable to be nulled for multipart mapping, got %v", operations.Variables["patch"])
	}

	var fileMap map[string][]string
	if err := json.Unmarshal([]byte(r.FormValue("map")), &fileMap); err != nil {
		c.t.Fatalf("failed to unmarshal multipart map: %v", err)
	}
	for part, variables := range fileMap {
		for _, variable := range variables {
			if variable == "variables.runId" {
				c.t.Fatalf("multipart part %s unexpectedly maps to runId", part)
			}
		}
	}
}

func (c *uploadHTTPClient) Post(string, string, io.Reader) (*http.Response, error) {
	c.t.Fatal("unexpected raw Post call")
	return nil, nil
}
