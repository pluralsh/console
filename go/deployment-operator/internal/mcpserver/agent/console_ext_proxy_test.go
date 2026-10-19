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
// received stops upstream, waiting for in-flight handlers, and returns what reached it.
func newConsoleExtTestSidecar(t *testing.T) (*httptest.Server, func() []receivedConsoleExtRequest) {
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
		if r.Header.Get("Authorization") != "Token deploy-token" {
			t.Errorf("authorization = %q", r.Header.Get("Authorization"))
		}
		received = append(received, got)
		_, _ = w.Write([]byte(`{"data":{}}`))
	}))
	t.Cleanup(upstream.Close)

	server := &Server{}
	WithConsoleExtProxy(upstream.URL+"/ext/gql", func() string { return "deploy-token" }, testAgentRunID)(server)
	sidecar := httptest.NewServer(server.consoleExtProxy)
	t.Cleanup(sidecar.Close)
	return sidecar, func() []receivedConsoleExtRequest {
		upstream.Close()
		return received
	}
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

	requests := received()
	if len(requests) != 2 {
		t.Fatalf("upstream received %d requests, want 2", len(requests))
	}
	get, upload := requests[0], requests[1]
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
		w.Header().Set("Set-Cookie", "grafana_token=deploy-token")
	}))
	defer upstream.Close()

	server := &Server{}
	WithConsoleExtProxy(upstream.URL+"/ext/gql", func() string { return "deploy-token" }, testAgentRunID)(server)

	request := jsonRequest("http://127.0.0.1/plural/ext/gql", map[string]any{
		"query":     client.GetAgentRunDocument,
		"variables": map[string]any{"id": testAgentRunID},
	})
	request.Header.Set(consoleExtClientHeader, "spoofed")
	request.Header.Set(consoleExtAgentRunHeader, "spoofed")
	response := httptest.NewRecorder()
	server.consoleExtProxy.ServeHTTP(response, request)

	if got := response.Header().Get("Set-Cookie"); got != "" {
		t.Fatalf("Set-Cookie reached the caller: %q", got)
	}
	if received == nil {
		t.Fatal("upstream did not receive request")
	}
	if got := received.Header.Get(consoleExtClientHeader); got != consoleExtClient {
		t.Fatalf("%s = %q", consoleExtClientHeader, got)
	}
	if got := received.Header.Get(consoleExtAgentRunHeader); got != testAgentRunID {
		t.Fatalf("%s = %q", consoleExtAgentRunHeader, got)
	}
	if got := received.Header.Get("Authorization"); got != "Token deploy-token" {
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

	// Requests the allowlist can't even parse get their own status; everything else is a 403.
	wantStatus := map[string]int{
		"batched":      http.StatusBadRequest,
		"form encoded": http.StatusUnsupportedMediaType,
		"get":          http.StatusMethodNotAllowed,
	}

	for name, request := range cases {
		t.Run(name, func(t *testing.T) {
			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			_ = response.Body.Close()
			want, ok := wantStatus[name]
			if !ok {
				want = http.StatusForbidden
			}
			if response.StatusCode != want {
				t.Fatalf("status = %d, want %d", response.StatusCode, want)
			}
			if want == http.StatusMethodNotAllowed && response.Header.Get("Allow") != http.MethodPost {
				t.Fatalf("Allow = %q, want POST", response.Header.Get("Allow"))
			}
		})
	}
	if requests := received(); len(requests) != 0 {
		t.Fatalf("upstream received %d requests, want 0", len(requests))
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

	requests := received()
	if len(requests) != 1 {
		t.Fatalf("upstream received %d requests, want 1", len(requests))
	}
	got := requests[0]
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
	operations, _ := json.Marshal(map[string]any{
		"query":     client.CreateAgentRunUploadDocument,
		"variables": map[string]any{"runId": testAgentRunID, "patch": nil},
	})

	cases := map[string]func(*multipart.Writer){
		"map targets a non-upload variable": func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.runId"]}`)
		},
		"map uses a named part": func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"documentId":["variables.patch"]}`)
		},
		"extra field after the map": func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.patch"]}`)
			_ = w.WriteField("documentId", client.HashQuery(client.GetAgentRuntimeDocument))
		},
		"duplicate file part": func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.patch"]}`)
			for range 2 {
				file, _ := w.CreateFormFile("0", "patch.diff")
				_, _ = file.Write([]byte("diff"))
			}
		},
		"file part not in the map": func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.patch"]}`)
			file, _ := w.CreateFormFile("1", "patch.diff")
			_, _ = file.Write([]byte("diff"))
		},
		"mapped part is not a file": func(w *multipart.Writer) {
			_ = w.WriteField("map", `{"0":["variables.patch"]}`)
			_ = w.WriteField("0", "diff")
		},
	}

	for name, parts := range cases {
		t.Run(name, func(t *testing.T) {
			sidecar, received := newConsoleExtTestSidecar(t)
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			_ = writer.WriteField("operations", string(operations))
			parts(writer)
			_ = writer.Close()
			request, _ := http.NewRequest(http.MethodPost, sidecar.URL, body)
			request.Header.Set("Content-Type", writer.FormDataContentType())

			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			_ = response.Body.Close()
			if response.StatusCode == http.StatusOK {
				t.Fatalf("status = 200, want a rejection")
			}
			// A part found mid-stream aborts the upstream body, so Console can't parse or run it.
			for _, got := range received() {
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

func TestConsoleExtProxyRejectsBadRequestsWithTheirStatus(t *testing.T) {
	upload := func(variables map[string]any, fields ...[2]string) *http.Request {
		operations, _ := json.Marshal(map[string]any{"query": client.CreateAgentRunUploadDocument, "variables": variables})
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		if len(fields) == 0 {
			fields = [][2]string{{"operations", string(operations)}, {"map", `{"0":["variables.patch"]}`}}
		}
		for _, field := range fields {
			_ = writer.WriteField(field[0], field[1])
		}
		file, _ := writer.CreateFormFile("0", "patch.diff")
		_, _ = file.Write([]byte("diff"))
		_ = writer.Close()
		r, _ := http.NewRequest(http.MethodPost, "", body)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		return r
	}
	ownUpload := map[string]any{"runId": testAgentRunID, "patch": nil}
	oversize := strings.Repeat("a", maxConsoleExtOperationBytes+1)

	cases := map[string]struct {
		request func(url string) *http.Request
		status  int
	}{
		"oversize operation": {func(url string) *http.Request {
			r, _ := http.NewRequest(http.MethodPost, url, strings.NewReader(`{"query":"`+oversize+`"}`))
			r.Header.Set("Content-Type", "application/json")
			return r
		}, http.StatusRequestEntityTooLarge},
		"malformed JSON": {func(url string) *http.Request {
			r, _ := http.NewRequest(http.MethodPost, url, strings.NewReader(`{"query":`))
			r.Header.Set("Content-Type", "application/json")
			return r
		}, http.StatusBadRequest},
		"multipart without a boundary": {func(url string) *http.Request {
			r, _ := http.NewRequest(http.MethodPost, url, strings.NewReader("x"))
			r.Header.Set("Content-Type", "multipart/form-data")
			return r
		}, http.StatusBadRequest},
		"oversize multipart operations": {func(url string) *http.Request {
			return upload(nil, [2]string{"operations", oversize})
		}, http.StatusRequestEntityTooLarge},
		"map before operations": {func(url string) *http.Request {
			operations, _ := json.Marshal(map[string]any{"query": client.CreateAgentRunUploadDocument, "variables": ownUpload})
			return upload(nil, [2]string{"map", `{"0":["variables.patch"]}`}, [2]string{"operations", string(operations)})
		}, http.StatusBadRequest},
		"upload variable already set": {func(url string) *http.Request {
			return upload(map[string]any{"runId": testAgentRunID, "patch": "inline"})
		}, http.StatusForbidden},
		"upload for another run": {func(url string) *http.Request {
			return upload(map[string]any{"runId": "other-run", "patch": nil})
		}, http.StatusForbidden},
		"message for another run": {func(url string) *http.Request {
			return jsonRequest(url, map[string]any{
				"query":     client.CreateAgentMessageDocument,
				"variables": map[string]any{"runId": "other-run", "attributes": map[string]any{}},
			})
		}, http.StatusForbidden},
		"run update for another run": {func(url string) *http.Request {
			return jsonRequest(url, map[string]any{
				"query":     client.UpdateAgentRunDocument,
				"variables": map[string]any{"id": "other-run", "attributes": map[string]any{}},
			})
		}, http.StatusForbidden},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			sidecar, received := newConsoleExtTestSidecar(t)
			request := tc.request(sidecar.URL)
			if request.URL.Host == "" {
				request.URL, _ = request.URL.Parse(sidecar.URL)
			}

			response, err := http.DefaultClient.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			body, _ := io.ReadAll(response.Body)
			_ = response.Body.Close()
			if response.StatusCode != tc.status {
				t.Fatalf("status = %d, want %d; body = %q", response.StatusCode, tc.status, body)
			}
			if requests := received(); len(requests) != 0 {
				t.Fatalf("upstream received %d requests, want 0", len(requests))
			}
		})
	}
}
