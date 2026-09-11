package acp

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"syscall"

	acpsdk "github.com/coder/acp-go-sdk"
)

const (
	maxTextFileBytes           = 16 << 20
	maxConcurrentTextFileReads = 1
)

var _ acpsdk.Client = (*client)(nil)

var (
	errTerminalUnavailable   = errors.New("acp terminal requests are unavailable in unattended runs")
	errReadGateUninitialized = errors.New("acp client text file read gate is not initialized")
)

type client struct {
	turn              *turnState
	cwd               string
	root              *os.Root
	textFileReadSlots chan struct{}
	fileSystemWrite   bool
}

func newClient(turn *turnState, cwd string, root *os.Root, fileSystemWrite bool) *client {
	return &client{
		turn:              turn,
		cwd:               cwd,
		root:              root,
		textFileReadSlots: make(chan struct{}, maxConcurrentTextFileReads),
		fileSystemWrite:   fileSystemWrite,
	}
}

func (client *client) ReadTextFile(ctx context.Context, request acpsdk.ReadTextFileRequest) (acpsdk.ReadTextFileResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	if err := client.acquireTextFileRead(ctx); err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	defer client.releaseTextFileRead()

	file, err := client.openTextFile(request.Path)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}

	return client.readTextFile(ctx, file, request)
}

func (client *client) acquireTextFileRead(ctx context.Context) error {
	if client.textFileReadSlots == nil {
		return errReadGateUninitialized
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	select {
	case client.textFileReadSlots <- struct{}{}:
		if err := ctx.Err(); err != nil {
			client.releaseTextFileRead()
			return err
		}

		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (client *client) releaseTextFileRead() {
	<-client.textFileReadSlots
}

func (client *client) readTextFile(ctx context.Context, reader io.ReadCloser, request acpsdk.ReadTextFileRequest) (response acpsdk.ReadTextFileResponse, err error) {
	defer func() {
		err = errors.Join(err, reader.Close())
	}()

	if err := ctx.Err(); err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}

	return client.readTextFileResponse(&contextReader{ctx: ctx, reader: reader}, request)
}

func (client *client) readTextFileResponse(reader io.Reader, request acpsdk.ReadTextFileRequest) (acpsdk.ReadTextFileResponse, error) {
	buffered := bufio.NewReader(io.LimitReader(reader, maxTextFileBytes+1))
	exhausted, err := client.skipTextFileLines(buffered, request.Line, request.Path)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	if exhausted {
		return acpsdk.ReadTextFileResponse{}, nil
	}

	content, err := client.readTextFileContent(buffered, request.Path, request.Limit)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}

	return acpsdk.ReadTextFileResponse{Content: content}, nil
}

func (client *client) openTextFile(path string) (*os.File, error) {
	relativePath, err := client.rootRelativePath(path)

	if err != nil {
		return nil, err
	}

	file, err := client.root.OpenFile(relativePath, os.O_RDONLY|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("stat %s: %w", path, err)
	}

	if !info.Mode().IsRegular() {
		_ = file.Close()
		return nil, fmt.Errorf("acp filesystem path is not a regular file: %q", path)
	}

	if info.Size() > maxTextFileBytes {
		_ = file.Close()
		return nil, fmt.Errorf("acp filesystem file exceeds %d-byte read limit: %q", maxTextFileBytes, path)
	}

	return file, nil
}

func (client *client) skipTextFileLines(reader *bufio.Reader, line *int, path string) (bool, error) {
	if line == nil {
		return false, nil
	}

	for current := 1; current < max(*line, 1); current++ {
		if _, err := reader.ReadString('\n'); err != nil {
			if errors.Is(err, io.EOF) {
				return true, nil
			}

			return false, fmt.Errorf("read %s: %w", path, err)
		}
	}

	return false, nil
}

func (client *client) readTextFileContent(reader *bufio.Reader, path string, limit *int) (string, error) {
	if limit == nil || *limit <= 0 {
		content, err := io.ReadAll(reader)

		if err != nil {
			return "", fmt.Errorf("read %s: %w", path, err)
		}
		if len(content) > maxTextFileBytes {
			return "", fmt.Errorf("acp filesystem file exceeds %d-byte read limit: %q", maxTextFileBytes, path)
		}

		return string(content), nil
	}

	lines := make([]string, 0, min(*limit, 1024))
	for len(lines) < *limit {
		line, err := reader.ReadString('\n')
		lines = append(lines, strings.TrimSuffix(line, "\n"))

		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return "", fmt.Errorf("read %s: %w", path, err)
		}
	}

	return strings.Join(lines, "\n"), nil
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (reader *contextReader) Read(buffer []byte) (int, error) {
	if err := reader.ctx.Err(); err != nil {
		return 0, err
	}

	read, err := reader.reader.Read(buffer)
	if contextErr := reader.ctx.Err(); contextErr != nil {
		return 0, contextErr
	}

	return read, err
}

func (client *client) WriteTextFile(ctx context.Context, request acpsdk.WriteTextFileRequest) (acpsdk.WriteTextFileResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.WriteTextFileResponse{}, err
	}
	if !client.fileSystemWrite {
		return acpsdk.WriteTextFileResponse{}, errors.New("acp filesystem writes are disabled")
	}

	path, err := client.rootRelativePath(request.Path)
	if err != nil {
		return acpsdk.WriteTextFileResponse{}, err
	}
	if ctx == nil {
		ctx = context.Background()
	}

	if err := ctx.Err(); err != nil {
		return acpsdk.WriteTextFileResponse{}, err
	}
	if err := client.root.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return acpsdk.WriteTextFileResponse{}, fmt.Errorf("mkdir %s: %w", request.Path, err)
	}

	if err := ctx.Err(); err != nil {
		return acpsdk.WriteTextFileResponse{}, err
	}
	if err := client.root.WriteFile(path, []byte(request.Content), 0o644); err != nil {
		return acpsdk.WriteTextFileResponse{}, fmt.Errorf("write %s: %w", request.Path, err)
	}

	return acpsdk.WriteTextFileResponse{}, nil
}

func (client *client) rootRelativePath(path string) (string, error) {
	if client.root == nil {
		return "", errors.New("acp client filesystem root is not set")
	}
	if !filepath.IsAbs(path) {
		return "", fmt.Errorf("acp filesystem path must be absolute: %q", path)
	}

	relative, err := filepath.Rel(client.cwd, path)
	if err != nil || relative == "." || !filepath.IsLocal(relative) {
		return "", fmt.Errorf("acp filesystem path is outside the working directory: %q", path)
	}

	return relative, nil
}

func (client *client) RequestPermission(_ context.Context, request acpsdk.RequestPermissionRequest) (acpsdk.RequestPermissionResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.RequestPermissionResponse{}, err
	}
	if err := client.turn.upsertPermissionTool(&request.ToolCall); err != nil {
		return acpsdk.RequestPermissionResponse{}, err
	}

	return acpsdk.RequestPermissionResponse{}, errors.New("acp permission requests are unavailable in unattended runs")
}

func (*client) CreateTerminal(context.Context, acpsdk.CreateTerminalRequest) (acpsdk.CreateTerminalResponse, error) {
	return acpsdk.CreateTerminalResponse{}, errTerminalUnavailable
}

func (*client) KillTerminal(context.Context, acpsdk.KillTerminalRequest) (acpsdk.KillTerminalResponse, error) {
	return acpsdk.KillTerminalResponse{}, errTerminalUnavailable
}

func (*client) TerminalOutput(context.Context, acpsdk.TerminalOutputRequest) (acpsdk.TerminalOutputResponse, error) {
	return acpsdk.TerminalOutputResponse{}, errTerminalUnavailable
}

func (*client) ReleaseTerminal(context.Context, acpsdk.ReleaseTerminalRequest) (acpsdk.ReleaseTerminalResponse, error) {
	return acpsdk.ReleaseTerminalResponse{}, errTerminalUnavailable
}

func (*client) WaitForTerminalExit(context.Context, acpsdk.WaitForTerminalExitRequest) (acpsdk.WaitForTerminalExitResponse, error) {
	return acpsdk.WaitForTerminalExitResponse{}, errTerminalUnavailable
}

func (client *client) SessionUpdate(_ context.Context, notification acpsdk.SessionNotification) error {
	return client.turn.handle(notification)
}

func (client *client) UnstableCreateElicitation(context.Context, acpsdk.UnstableCreateElicitationRequest) (acpsdk.UnstableCreateElicitationResponse, error) {
	return acpsdk.UnstableCreateElicitationResponse{}, errors.New("acp elicitation requests are unavailable in unattended runs")
}

func (client *client) validateSession(sessionID acpsdk.SessionId) error {
	if client.turn == nil {
		return errors.New("acp client is not attached to a turn")
	}

	expected := client.turn.sessionID()
	if sessionID != acpsdk.SessionId(expected) {
		return fmt.Errorf("acp request belongs to session %q, expected %q", sessionID, expected)
	}

	return nil
}
