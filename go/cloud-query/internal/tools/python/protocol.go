package python

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"sync"
)

const (
	protocolVersion = 1
	requestHealth   = "health"
	requestRun      = "run"
)

type protocolRequest struct {
	Version   int    `json:"version"`
	Type      string `json:"type"`
	ID        string `json:"id"`
	Script    string `json:"script,omitempty"`
	InputJSON string `json:"input_json,omitempty"`
}

type protocolResponse struct {
	Version    int    `json:"version"`
	Type       string `json:"type"`
	ID         string `json:"id"`
	ResultJSON string `json:"result_json,omitempty"`
	Stdout     string `json:"stdout,omitempty"`
	Code       Code   `json:"code,omitempty"`
	Message    string `json:"message,omitempty"`
}

func readFrame(in io.Reader, into any) error {
	var header [4]byte
	if _, err := io.ReadFull(in, header[:]); err != nil {
		return err
	}
	length := binary.BigEndian.Uint32(header[:])
	if length == 0 || length > maxProtocolFrameLen {
		return errors.New("invalid protocol frame")
	}
	body := make([]byte, length)
	if _, err := io.ReadFull(in, body); err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(into); err != nil {
		return errors.New("invalid protocol payload")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("invalid protocol payload")
	}
	return nil
}

func writeFrame(out io.Writer, value any) error {
	body, err := json.Marshal(value)
	if err != nil || len(body) == 0 || len(body) > maxProtocolFrameLen {
		return errors.New("invalid protocol response")
	}
	frame := make([]byte, 4+len(body))
	binary.BigEndian.PutUint32(frame, uint32(len(body)))
	copy(frame[4:], body)
	_, err = io.Copy(out, bytes.NewReader(frame))
	return err
}

type childWorker struct {
	stdin    io.WriteCloser
	stdout   io.ReadCloser
	kill     func()
	mu       sync.Mutex
	stopOnce sync.Once
}

func (w *childWorker) stop() { w.stopOnce.Do(w.kill) }

func (w *childWorker) exchange(ctx context.Context, request protocolRequest) (protocolResponse, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	result := make(chan struct {
		response protocolResponse
		err      error
	}, 1)
	go func() {
		if err := writeFrame(w.stdin, request); err != nil {
			result <- struct {
				response protocolResponse
				err      error
			}{err: err}
			return
		}
		var response protocolResponse
		result <- struct {
			response protocolResponse
			err      error
		}{response: response, err: readFrame(w.stdout, &response)}
	}()
	select {
	case result := <-result:
		if result.err != nil || result.response.Version != protocolVersion || result.response.ID != request.ID || result.response.Type != request.Type {
			return protocolResponse{}, runtimeFailure()
		}
		if (result.response.Code == "") != (result.response.Message == "") {
			return protocolResponse{}, runtimeFailure()
		}
		if request.Type == requestHealth && (result.response.ResultJSON != "" || result.response.Stdout != "") {
			return protocolResponse{}, runtimeFailure()
		}
		if result.response.Code != "" && (result.response.ResultJSON != "" || result.response.Stdout != "") {
			return protocolResponse{}, runtimeFailure()
		}
		if request.Type == requestRun && result.response.Code == "" && (len(result.response.ResultJSON) > MaxResultBytes || len(result.response.Stdout) > MaxStdoutBytes || !isJSONObject(result.response.ResultJSON)) {
			return protocolResponse{}, runtimeFailure()
		}
		return result.response, nil
	case <-ctx.Done():
		w.stop()
		return protocolResponse{}, executionContextError(ctx.Err())
	}
}

func protocolError(response protocolResponse) error {
	if response.Code == "" || response.Message == "" {
		return runtimeFailure()
	}
	switch response.Code {
	case InvalidArgument, FailedPrecondition, Canceled, DeadlineExceeded, ResourceExhausted, Unavailable, Internal:
		return &Error{Code: response.Code, Msg: response.Message}
	default:
		return runtimeFailure()
	}
}
