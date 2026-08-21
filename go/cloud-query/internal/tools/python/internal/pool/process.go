package pool

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"sync"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/protocol"
)

type process interface {
	exchange(context.Context, protocol.Request) (protocol.Response, error)
	stop()
}

type processFactory func(ProcessConfig) (process, error)

type execProcess struct {
	stdin  io.WriteCloser
	stdout io.ReadCloser
	kill   func()
	codec  protocol.Codec
	mu     sync.Mutex
	once   sync.Once
}

func newExecProcess(config ProcessConfig) (process, error) {
	cmd := exec.Command(config.Executable, config.Arguments...)
	cmd.Env = append([]string(nil), config.Environment...)

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("opening python worker stdin: %w", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("opening python worker stdout: %w", err)
	}

	if err = cmd.Start(); err != nil {
		return nil, fmt.Errorf("starting python worker process: %w", err)
	}

	p := &execProcess{
		stdin:  stdin,
		stdout: stdout,
		codec:  protocol.NewCodec(protocol.MaxFrameSize),
	}

	p.kill = func() {
		_ = stdin.Close()
		_ = stdout.Close()
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		_ = cmd.Wait()
	}

	return p, nil
}

func (p *execProcess) stop() {
	p.once.Do(p.kill)
}

func (p *execProcess) exchange(ctx context.Context, request protocol.Request) (protocol.Response, error) {
	p.mu.Lock()
	defer p.mu.Unlock()

	result := make(chan struct {
		response protocol.Response
		err      error
	}, 1)
	go func() {
		if err := p.codec.WriteRequest(p.stdin, request); err != nil {
			result <- struct {
				response protocol.Response
				err      error
			}{err: err}
			return
		}
		response, err := p.codec.ReadResponse(p.stdout, request)
		result <- struct {
			response protocol.Response
			err      error
		}{response, err}
	}()
	select {
	case result := <-result:
		if result.err != nil {
			return protocol.Response{}, contract.InternalError(result.err)
		}
		return result.response, nil
	case <-ctx.Done():
		p.stop()
		return protocol.Response{}, contract.ContextError(ctx.Err())
	}
}
