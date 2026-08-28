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

type client struct {
	turn *turnState
}

func (client *client) ReadTextFile(_ context.Context, request acpsdk.ReadTextFileRequest) (acpsdk.ReadTextFileResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.ReadTextFileResponse{}, err
	}
	if !filepath.IsAbs(request.Path) {
		return acpsdk.ReadTextFileResponse{}, fmt.Errorf("ACP filesystem path must be absolute: %q", request.Path)
	}
	file, err := os.Open(request.Path)
	if err != nil {
		return acpsdk.ReadTextFileResponse{}, fmt.Errorf("read %s: %w", request.Path, err)
	}
	defer file.Close()

	reader := bufio.NewReader(file)
	if request.Line != nil {
		for line := 1; line < max(*request.Line, 1); line++ {
			if _, readErr := reader.ReadString('\n'); readErr != nil {
				if errors.Is(readErr, io.EOF) {
					return acpsdk.ReadTextFileResponse{}, nil
				}
				return acpsdk.ReadTextFileResponse{}, fmt.Errorf("read %s: %w", request.Path, readErr)
			}
		}
	}
	if request.Limit == nil || *request.Limit <= 0 {
		content, readErr := io.ReadAll(reader)
		if readErr != nil {
			return acpsdk.ReadTextFileResponse{}, fmt.Errorf("read %s: %w", request.Path, readErr)
		}
		return acpsdk.ReadTextFileResponse{Content: string(content)}, nil
	}

	lines := make([]string, 0, min(*request.Limit, 1024))
	for len(lines) < *request.Limit {
		line, readErr := reader.ReadString('\n')
		lines = append(lines, strings.TrimSuffix(line, "\n"))
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				break
			}
			return acpsdk.ReadTextFileResponse{}, fmt.Errorf("read %s: %w", request.Path, readErr)
		}
	}
	return acpsdk.ReadTextFileResponse{Content: strings.Join(lines, "\n")}, nil
}

func (client *client) WriteTextFile(_ context.Context, request acpsdk.WriteTextFileRequest) (acpsdk.WriteTextFileResponse, error) {
	if err := client.validateSession(request.SessionId); err != nil {
		return acpsdk.WriteTextFileResponse{}, err
	}
	if !filepath.IsAbs(request.Path) {
		return acpsdk.WriteTextFileResponse{}, fmt.Errorf("ACP filesystem path must be absolute: %q", request.Path)
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
	return acpsdk.RequestPermissionResponse{}, errors.New("ACP permission requests are unavailable in unattended runs")
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
	return acpsdk.UnstableCreateElicitationResponse{}, errors.New("ACP elicitation requests are unavailable in unattended runs")
}

func (client *client) validateSession(sessionID acpsdk.SessionId) error {
	if client.turn == nil {
		return errors.New("ACP client is not attached to a turn")
	}
	expected := client.turn.sessionID()
	if sessionID != acpsdk.SessionId(expected) {
		return fmt.Errorf("ACP request belongs to session %q, expected %q", sessionID, expected)
	}
	return nil
}

var _ acpsdk.Client = (*client)(nil)
