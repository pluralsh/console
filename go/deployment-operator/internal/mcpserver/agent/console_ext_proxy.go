package agent

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"net/url"
	"regexp"
	"slices"
	"strings"

	"github.com/pluralsh/console/go/client"
)

// maxConsoleExtOperationBytes caps the JSON operation the sidecar buffers. Upload files are streamed.
const maxConsoleExtOperationBytes = 10 << 20

type consoleExtOperation struct {
	// runIDVariable must hold this agent run's ID. Empty when the operation takes no run ID.
	runIDVariable string
	// uploads are the variables that may be sent as multipart files.
	uploads []string
}

// consoleExtOperations are the only Console ext documents the harness sends, keyed by persisted query hash.
var consoleExtOperations = map[string]consoleExtOperation{
	client.HashQuery(client.GetAgentRunDocument):              {runIDVariable: "id"},
	client.HashQuery(client.UpdateAgentRunDocument):           {runIDVariable: "id"},
	client.HashQuery(client.CreateAgentMessageDocument):       {runIDVariable: "runId"},
	client.HashQuery(client.UpdateAgentMessageDocument):       {},
	client.HashQuery(client.CreateAgentMessageOutputDocument): {},
	client.HashQuery(client.CreateAgentRunUploadDocument): {
		runIDVariable: "runId",
		uploads:       []string{"session", "screenRecording", "patch"},
	},
}

var uploadPartName = regexp.MustCompile(`^[0-9]+$`)

type consoleExtRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

// newConsoleExtAllowlist only lets the harness's own operations on this agent run through. Console
// merges URL and body params and prefers a persisted documentId over the query, so the request is
// rebuilt from the checked query and variables instead of being forwarded as sent.
func newConsoleExtAllowlist(agentRunID string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := rebuildConsoleExtRequest(r, agentRunID); err != nil {
			status := http.StatusForbidden
			var rejected *consoleExtRejection
			if errors.As(err, &rejected) {
				status = rejected.status
			}
			if status == http.StatusMethodNotAllowed {
				w.Header().Set("Allow", http.MethodPost)
			}
			http.Error(w, err.Error(), status)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// consoleExtRejection is a refused request that isn't an allowlist violation, answered with its own status.
// Every other error is answered with 403.
type consoleExtRejection struct {
	status int
	err    error
}

func (e *consoleExtRejection) Error() string { return e.err.Error() }

func (e *consoleExtRejection) Unwrap() error { return e.err }

func reject(status int, format string, args ...any) error {
	return &consoleExtRejection{status: status, err: fmt.Errorf(format, args...)}
}

func rebuildConsoleExtRequest(r *http.Request, agentRunID string) error {
	if r.Method != http.MethodPost {
		return reject(http.StatusMethodNotAllowed, "method %s is not allowed", r.Method)
	}

	mediaType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil {
		return reject(http.StatusBadRequest, "invalid content type: %w", err)
	}

	switch mediaType {
	case "application/json":
		body, err := io.ReadAll(io.LimitReader(r.Body, maxConsoleExtOperationBytes+1))
		if err != nil {
			return reject(http.StatusBadRequest, "could not read request: %w", err)
		}
		if len(body) > maxConsoleExtOperationBytes {
			return reject(http.StatusRequestEntityTooLarge, "request is too large")
		}
		request, hash, err := checkConsoleExtOperation(body, agentRunID, nil)
		if err != nil {
			return err
		}
		canonical, err := json.Marshal(request)
		if err != nil {
			return err
		}
		setConsoleExtBody(r, hash, "application/json", io.NopCloser(bytes.NewReader(canonical)), int64(len(canonical)))
		return nil
	case "multipart/form-data":
		return rebuildConsoleExtMultipart(r, agentRunID, params["boundary"])
	default:
		return reject(http.StatusUnsupportedMediaType, "content type %s is not allowed", mediaType)
	}
}

// checkConsoleExtOperation parses an operation and checks it against the allowlist. uploadMap, when set,
// is the multipart map of file part names to variable paths.
func checkConsoleExtOperation(body []byte, agentRunID string, uploadMap map[string][]string) (*consoleExtRequest, string, error) {
	request := &consoleExtRequest{}
	if err := json.Unmarshal(body, request); err != nil {
		return nil, "", reject(http.StatusBadRequest, "invalid operation: %w", err)
	}

	hash := client.HashQuery(request.Query)
	operation, ok := consoleExtOperations[hash]
	if !ok {
		return nil, "", fmt.Errorf("operation is not allowed")
	}
	if operation.runIDVariable != "" && request.Variables[operation.runIDVariable] != agentRunID {
		return nil, "", fmt.Errorf("operation must target agent run %s", agentRunID)
	}

	for name, paths := range uploadMap {
		if !uploadPartName.MatchString(name) || len(paths) != 1 {
			return nil, "", fmt.Errorf("invalid upload map entry %q", name)
		}
		variable, ok := strings.CutPrefix(paths[0], "variables.")
		if !ok || !slices.Contains(operation.uploads, variable) || request.Variables[variable] != nil {
			return nil, "", fmt.Errorf("upload to %q is not allowed", paths[0])
		}
	}

	return request, hash, nil
}

// rebuildConsoleExtMultipart checks the operations and map parts up front, then streams only the
// mapped file parts upstream. A bad file part aborts the upstream body so Console never runs it.
func rebuildConsoleExtMultipart(r *http.Request, agentRunID, boundary string) error {
	if boundary == "" {
		return reject(http.StatusBadRequest, "multipart request has no boundary")
	}
	reader := multipart.NewReader(r.Body, boundary)

	operations, err := readFormField(reader, "operations")
	if err != nil {
		return err
	}
	rawMap, err := readFormField(reader, "map")
	if err != nil {
		return err
	}
	uploadMap := map[string][]string{}
	if err := json.Unmarshal(rawMap, &uploadMap); err != nil {
		return reject(http.StatusBadRequest, "invalid upload map: %w", err)
	}

	request, hash, err := checkConsoleExtOperation(operations, agentRunID, uploadMap)
	if err != nil {
		return err
	}

	pipeReader, pipeWriter := io.Pipe()
	writer := multipart.NewWriter(pipeWriter)
	go func() {
		pipeWriter.CloseWithError(writeConsoleExtMultipart(writer, reader, request, uploadMap))
	}()
	setConsoleExtBody(r, hash, writer.FormDataContentType(), pipeReader, -1)
	return nil
}

func writeConsoleExtMultipart(writer *multipart.Writer, reader *multipart.Reader, request *consoleExtRequest, uploadMap map[string][]string) error {
	if err := writeJSONField(writer, "operations", request); err != nil {
		return err
	}
	if err := writeJSONField(writer, "map", uploadMap); err != nil {
		return err
	}

	seen := map[string]bool{}
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			return writer.Close()
		}
		if err != nil {
			return err
		}

		name := part.FormName()
		if _, ok := uploadMap[name]; !ok || seen[name] || part.FileName() == "" {
			return fmt.Errorf("unexpected multipart part %q", name)
		}
		seen[name] = true

		header := textproto.MIMEHeader{}
		header.Set("Content-Disposition", mime.FormatMediaType("form-data", map[string]string{"name": name, "filename": part.FileName()}))
		if contentType := part.Header.Get("Content-Type"); contentType != "" {
			header.Set("Content-Type", contentType)
		}
		out, err := writer.CreatePart(header)
		if err != nil {
			return err
		}
		if _, err := io.Copy(out, part); err != nil {
			return err
		}
	}
}

func readFormField(reader *multipart.Reader, name string) ([]byte, error) {
	part, err := reader.NextPart()
	if err != nil {
		return nil, reject(http.StatusBadRequest, "could not read multipart %q field: %w", name, err)
	}
	if part.FormName() != name || part.FileName() != "" {
		return nil, reject(http.StatusBadRequest, "expected multipart %q field, got %q", name, part.FormName())
	}
	value, err := io.ReadAll(io.LimitReader(part, maxConsoleExtOperationBytes+1))
	if err != nil {
		return nil, reject(http.StatusBadRequest, "could not read multipart %q field: %w", name, err)
	}
	if len(value) > maxConsoleExtOperationBytes {
		return nil, reject(http.StatusRequestEntityTooLarge, "multipart %q field is too large", name)
	}
	return value, nil
}

func writeJSONField(writer *multipart.Writer, name string, value any) error {
	field, err := writer.CreateFormField(name)
	if err != nil {
		return err
	}
	return json.NewEncoder(field).Encode(value)
}

// setConsoleExtBody replaces the body and drops every caller URL param, keeping only the checked documentId.
func setConsoleExtBody(r *http.Request, hash, contentType string, body io.ReadCloser, length int64) {
	r.Body = body
	r.ContentLength = length
	r.Header.Del("Content-Length")
	r.Header.Set("Content-Type", contentType)
	r.URL.RawQuery = url.Values{"documentId": {hash}}.Encode()
}
