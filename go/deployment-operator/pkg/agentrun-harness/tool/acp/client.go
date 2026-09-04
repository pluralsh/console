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

	acpsdk "github.com/coder/acp-go-sdk"
)

const maxTextFileBytes = 16 << 20

var _ acpsdk.Client = (*client)(nil)

type client struct {
	turn *turnState
}

func (client *client) ReadTextFile(ctx context.Context, request acpsdk.ReadTextFileRequest) (acpsdk.ReadTextFileResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	if err := ctx.Err(); err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	file, err := client.openTextFile(request.Path)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	defer file.Close()

	reader := bufio.NewReader(io.LimitReader(&contextReader{ctx: ctx, reader: file}, maxTextFileBytes+1))
	exhausted, err := client.skipTextFileLines(reader, request.Line, request.Path)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	if exhausted {
		return acpsdk.ReadTextFileResponse{}, nil
	}
	content, err := client.readTextFileContent(reader, request.Path, request.Limit)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	return acpsdk.ReadTextFileResponse{Content: content}, nil
}

func (client *client) openTextFile(path string) (*os.File, error) {
	if !filepath.IsAbs(path) {
		return nil, fmt.Errorf("acp filesystem path must be absolute: %q", path)
	}
	file, err := os.Open(path)
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
	return reader.reader.Read(buffer)
}

func (client *client) WriteTextFile(_ context.Context, request acpsdk.WriteTextFileRequest) (acpsdk.WriteTextFileResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.WriteTextFileResponse{}, err
	}
	if !filepath.IsAbs(request.Path) {
		return acpsdk.WriteTextFileResponse{}, fmt.Errorf("acp filesystem path must be absolute: %q", request.Path)
	}
	if err := os.MkdirAll(filepath.Dir(request.Path), 0o755); err != nil {
		return acpsdk.WriteTextFileResponse{}, fmt.Errorf("mkdir %s: %w", filepath.Dir(request.Path), err)
	}
	if err := os.WriteFile(request.Path, []byte(request.Content), 0o644); err != nil {
		return acpsdk.WriteTextFileResponse{}, fmt.Errorf("write %s: %w", request.Path, err)
	}
	return acpsdk.WriteTextFileResponse{}, nil
}

func (client *client) RequestPermission(context.Context, acpsdk.RequestPermissionRequest) (acpsdk.RequestPermissionResponse, error) {
	return acpsdk.RequestPermissionResponse{}, errors.New("acp permission requests are unavailable in unattended runs")
}

func (*client) CreateTerminal(context.Context, acpsdk.CreateTerminalRequest) (acpsdk.CreateTerminalResponse, error) {
	return acpsdk.CreateTerminalResponse{TerminalId: "terminal-1"}, nil
}

func (*client) KillTerminal(context.Context, acpsdk.KillTerminalRequest) (acpsdk.KillTerminalResponse, error) {
	return acpsdk.KillTerminalResponse{}, nil
}

func (*client) TerminalOutput(context.Context, acpsdk.TerminalOutputRequest) (acpsdk.TerminalOutputResponse, error) {
	return acpsdk.TerminalOutputResponse{Output: "", Truncated: false}, nil
}

func (*client) ReleaseTerminal(context.Context, acpsdk.ReleaseTerminalRequest) (acpsdk.ReleaseTerminalResponse, error) {
	return acpsdk.ReleaseTerminalResponse{}, nil
}

func (*client) WaitForTerminalExit(context.Context, acpsdk.WaitForTerminalExitRequest) (acpsdk.WaitForTerminalExitResponse, error) {
	return acpsdk.WaitForTerminalExitResponse{}, nil
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
