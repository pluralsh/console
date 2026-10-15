package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/99designs/gqlgen/graphql"

	"github.com/pluralsh/console/go/client"
)

const testAgentRunID = "run-id"

type receivedConsoleExtRequest struct {
	documentID string
	query      string
	params     map[string]any
	files      map[string]string
	parseErr   error
}

// newConsoleExtTestSidecar serves the sidecar's Console ext proxy and records what reaches upstream.
func newConsoleExtTestSidecar(t *testing.T) (*httptest.Server, *[]receivedConsoleExtRequest) {
	t.Helper()
	var received []receivedConsoleExtRequest
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := receivedConsoleExtRequest{documentID: r.URL.Query().Get("documentId"), query: r.URL.RawQuery, files: map[string]string{}}
		if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
			got.parseErr = r.ParseMultipartForm(1 << 20)
			if got.parseErr == nil {
				got.params = map[string]any{}
				for name, values := range r.MultipartForm.Value {
					got.params[name] = values[0]
				}
				for name, headers := range r.MultipartForm.File {
					file, _ := headers[0].Open()
					content, _ := io.ReadAll(file)
					got.files[name] = string(content)
				}
			}
		} else {
			got.parseErr = json.NewDecoder(r.Body).Decode(&got.params)
		}
		if r.Header.Get("Authorization") != "Bearer deploy-token" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		received = append(received, got)
		_, _ = w.Write([]byte(`{"data":{}}`))
	}))
	t.Cleanup(upstream.Close)

	server := &Server{}
	WithConsoleExtProxy(upstream.URL+"/ext/gql", "deploy-token", testAgentRunID)(server)
	sidecar := httptest.NewServer(server.consoleExtProxy)
	t.Cleanup(sidecar.Close)
	return sidecar, &received
}

func newConsoleExtTestClient(url string) client.ConsoleClient {
	return client.NewClient(http.DefaultClient, url, nil, client.PersistedQueryInterceptor)
}

func TestConsoleExtProxyAllowsHarnessOperations(t *testing.T) {
	sidecar, received := newConsoleExtTestSidecar(t)
	console := newConsoleExtTestClient(sidecar.URL)

	_, _ = console.GetAgentRun(context.Background(), testAgentRunID)
	patch := &graphql.Upload{File: strings.NewReader("diff"), Filename: "patch.diff", ContentType: "text/plain"}
	_, _ = console.CreateAgentRunUpload(context.Background(), testAgentRunID, nil, nil, patch)

	if len(*received) != 2 {
		t.Fatalf("upstream received %d requests, want 2", len(*received))
	}
	get, upload := (*received)[0], (*received)[1]
	if get.parseErr != nil || get.documentID != client.HashQuery(client.GetAgentRunDocument) {
		t.Fatalf("GetAgentRun reached upstream as %+v", get)
	}
	if upload.parseErr != nil || upload.documentID != client.HashQuery(client.CreateAgentRunUploadDocument) {
		t.Fatalf("CreateAgentRunUpload reached upstream as %+v", upload)
	}
	if len(upload.files) != 1 {
		t.Fatalf("upload files = %v", upload.files)
	}
	for _, content := range upload.files {
		if content != "diff" {
			t.Fatalf("upload content = %q", content)
		}
	}
}

func TestConsoleExtProxyMarksClientAndRun(t *testing.T) {
	var received *http.Request
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received = r.Clone(r.Context())
	}))
	defer upstream.Close()

	server := &Server{}
	WithConsoleExtProxy(upstream.URL+"/ext/gql", "deploy-token", testAgentRunID)(server)

	request := jsonRequest("http://127.0.0.1/plural/ext/gql", map[string]any{
		"query":     client.GetAgentRunDocument,
		"variables": map[string]any{"id": testAgentRunID},
	})
	request.Header.Set(consoleExtClientHeader, "spoofed")
	request.Header.Set(consoleExtAgentRunHeader, "spoofed")
	server.consoleExtProxy.ServeHTTP(httptest.NewRecorder(), request)

	if received == nil {
		t.Fatal("upstream did not receive request")
	}
	if got := received.Header.Get(consoleExtClientHeader); got != consoleExtClient {
		t.Fatalf("%s = %q", consoleExtClientHeader, got)
	}
	if got := received.Header.Get(consoleExtAgentRunHeader); got != testAgentRunID {
		t.Fatalf("%s = %q", consoleExtAgentRunHeader, got)
	}
	if got := received.Header.Get("Authorization"); got != "Bearer deploy-token" {
		t.Fatalf("authorization = %q", got)
	}
}

func TestConsoleExtProxyRejectsOtherOperations(t *testing.T) {
	sidecar, received := newConsoleExtTestSidecar(t)

	cases := map[string]*http.Request{
		"not allowlisted": jsonRequest(sidecar.URL, map[string]any{
			"operationName": "GetAgentRun",
			"query":         client.GetAgentRuntimeDocument,
			"variables":     map[string]any{"id": testAgentRunID},
		}),
		"run credentials": jsonRequest(sidecar.URL, map[string]any{
			"query":     client.GetAgentRunCredentialsDocument,
			"variables": map[string]any{"id": testAgentRunID},
		}),
		"other agent run": jsonRequest(sidecar.URL, map[string]any{
			"query":     client.GetAgentRunDocument,
			"variables": map[string]any{"id": "other-run"},
		}),
		"batched": jsonRequest(sidecar.URL, []any{map[string]any{
			"query":     client.GetAgentRunDocument,
			"variables": map[string]any{"id": testAgentRunID},
		}}),
		"form encoded": func() *http.Request {
			r, _ := http.NewRequest(http.MethodPost, sidecar.URL, strings.NewReader("query=x"))
			r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			return r
		}(),
		"get": func() *http.Request {
			r, _ := http.NewRequest(http.MethodGet, sidecar.URL+"?query=x", nil)
			return r
		}(),
	}

	for name, request := range cases {
		t.Run(name, func(t *testing.T) {
			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			_ = response.Body.Close()
			if response.StatusCode != http.StatusForbidden {
				t.Fatalf("status = %d, want 403", response.StatusCode)
			}
		})
	}
	if len(*received) != 0 {
		t.Fatalf("upstream received %d requests, want 0", len(*received))
	}
}

func TestConsoleExtProxyDropsSmuggledDocumentIDs(t *testing.T) {
	sidecar, received := newConsoleExtTestSidecar(t)
	otherHash := client.HashQuery(client.GetAgentRuntimeDocument)

	request := jsonRequest(sidecar.URL+"?documentId="+otherHash+"&query=x", map[string]any{
		"query":      client.GetAgentRunDocument,
		"variables":  map[string]any{"id": testAgentRunID},
		"documentId": otherHash,
		"extensions": map[string]any{"persistedQuery": map[string]any{"sha256Hash": otherHash}},
	})
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	_ = response.Body.Close()

	if len(*received) != 1 {
		t.Fatalf("upstream received %d requests, want 1", len(*received))
	}
	got := (*received)[0]
	if got.query != "documentId="+strings.ReplaceAll(client.HashQuery(client.GetAgentRunDocument), ":", "%3A") {
		t.Fatalf("upstream URL query = %q", got.query)
	}
	for _, key := range []string{"documentId", "extensions"} {
		if _, ok := got.params[key]; ok {
			t.Fatalf("upstream body kept %q: %v", key, got.params)
		}
	}
}

func TestConsoleExtProxyRejectsUnexpectedMultipartParts(t *testing.T) {
	sidecar, received := newConsoleExtTestSidecar(t)
	operations, _ := json.Marshal(map[string]any{
		"query":     client.CreateAgentRunUploadDocument,
		"variables": map[string]any{"runId": testAgentRunID, "patch": nil},
	})

	build := func(parts func(*multipart.Writer)) *http.Request {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		_ = writer.WriteField("operations", string(operations))
		parts(writer)
		_ = writer.Close()
		r, _ := http.NewRequest(http.MethodPost, sidecar.URL, body)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		return r
	}

	cases := map[string]*http.Request{
		"map targets a non-upload variable": build(func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.runId"]}`)
		}),
		"map uses a named part": build(func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"documentId":["variables.patch"]}`)
		}),
		"extra field after the map": build(func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.patch"]}`)
			_ = w.WriteField("documentId", client.HashQuery(client.GetAgentRuntimeDocument))
		}),
	}

	for name, request := range cases {
		t.Run(name, func(t *testing.T) {
			before := len(*received)
			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			_ = response.Body.Close()
			if response.StatusCode == http.StatusOK {
				t.Fatalf("status = 200, want a rejection")
			}
			// A part found mid-stream aborts the upstream body, so Console can't parse or run it.
			for _, got := range (*received)[before:] {
				if got.parseErr == nil {
					t.Fatalf("upstream parsed the request: %+v", got)
				}
			}
		})
	}
}

func jsonRequest(url string, body any) *http.Request {
	payload, _ := json.Marshal(body)
	r, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	r.Header.Set("Content-Type", "application/json")
	return r
}
