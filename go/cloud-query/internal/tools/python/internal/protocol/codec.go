package protocol

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
)

// Version identifies the private parent-to-worker protocol version.
const Version = 1

// MaxFrameSize bounds a framed protocol payload before the codec allocates it.
const MaxFrameSize = contract.MaxSourceBytes +
	contract.MaxInputBytes +
	contract.MaxResultBytes +
	contract.MaxStdoutBytes +
	contract.MaxDetailBytes +
	16<<10
const (
	// Health requests a worker startup or liveness check.
	Health = "health"
	// Run requests one restricted Python execution.
	Run = "run"
)

// Request is a validated parent-to-worker protocol message.
type Request struct {
	Version   int    `json:"version"`
	Kind      string `json:"kind"`
	ID        string `json:"id"`
	Script    string `json:"script,omitempty"`
	InputJSON string `json:"input_json,omitempty"`
}

// Response is a validated worker-to-parent protocol message.
type Response struct {
	Version    int        `json:"version"`
	Kind       string     `json:"kind"`
	ID         string     `json:"id"`
	ResultJSON string     `json:"result_json,omitempty"`
	Stdout     string     `json:"stdout,omitempty"`
	Error      *WireError `json:"error,omitempty"`
}

// WireError carries a stable code, sanitized public summary, and bounded private
// diagnostic over the worker protocol. Detail must not reach untrusted callers.
type WireError struct {
	Code          contract.Code `json:"code"`
	PublicMessage string        `json:"public_message"`
	Detail        string        `json:"detail"`
}

// Codec reads and writes strict, bounded, length-prefixed protocol frames.
type Codec struct{ maxFrameSize int }

// NewCodec creates a codec that rejects frames larger than maxFrameSize.
func NewCodec(maxFrameSize int) Codec { return Codec{maxFrameSize: maxFrameSize} }

// ReadRequest reads and validates one request frame.
func (c Codec) ReadRequest(in io.Reader) (Request, error) {
	var request Request
	if err := c.read(in, &request); err != nil {
		return Request{}, err
	}
	if err := c.validRequest(request); err != nil {
		return Request{}, err
	}
	return request, nil
}

// WriteRequest validates and writes one request frame.
func (c Codec) WriteRequest(out io.Writer, request Request) error {
	if err := c.validRequest(request); err != nil {
		return err
	}
	return c.write(out, request)
}

// ReadResponse reads and validates a response matched to request.
func (c Codec) ReadResponse(in io.Reader, request Request) (Response, error) {
	var response Response
	if err := c.read(in, &response); err != nil {
		return Response{}, err
	}
	if err := c.validResponse(request, response); err != nil {
		return Response{}, err
	}
	return response, nil
}

// WriteResponse validates and writes a response matched to request.
func (c Codec) WriteResponse(out io.Writer, request Request, response Response) error {
	if err := c.validResponse(request, response); err != nil {
		return err
	}
	return c.write(out, response)
}

func (c Codec) read(in io.Reader, into any) error {
	var header [4]byte
	if _, err := io.ReadFull(in, header[:]); err != nil {
		return err
	}

	length := int(binary.BigEndian.Uint32(header[:]))
	if length == 0 || length > c.maxFrameSize {
		return errors.New("invalid python protocol frame")
	}

	body := make([]byte, length)
	if _, err := io.ReadFull(in, body); err != nil {
		return err
	}

	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(into); err != nil {
		return errors.New("invalid python protocol payload")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("invalid python protocol payload")
	}
	return nil
}

func (c Codec) write(out io.Writer, value any) error {
	body, err := json.Marshal(value)
	if err != nil || len(body) == 0 || len(body) > c.maxFrameSize {
		return errors.New("invalid python protocol frame")
	}

	frame := make([]byte, 4+len(body))
	binary.BigEndian.PutUint32(frame, uint32(len(body)))
	copy(frame[4:], body)

	for len(frame) > 0 {
		n, err := out.Write(frame)
		if err != nil {
			return err
		}
		if n <= 0 {
			return io.ErrShortWrite
		}
		frame = frame[n:]
	}
	return nil
}

func (c Codec) validRequest(request Request) error {
	if request.Version != Version || request.ID == "" {
		return errors.New("invalid python protocol request")
	}

	switch request.Kind {
	case Health:
		if request.Script != "" || request.InputJSON != "" {
			return errors.New("invalid python protocol request")
		}
	case Run:
		if request.Script == "" ||
			len(request.Script) > contract.MaxSourceBytes ||
			len(request.InputJSON) > contract.MaxInputBytes {
			return errors.New("invalid python protocol request")
		}
		if _, err := contract.NormalizeInput(request.InputJSON); err != nil {
			return errors.New("invalid python protocol request")
		}
	default:
		return errors.New("invalid python protocol request")
	}
	return nil
}

func (c Codec) validResponse(request Request, response Response) error {
	if response.Version != Version ||
		response.Kind != request.Kind ||
		response.ID != request.ID {
		return errors.New("invalid python protocol response")
	}

	if response.Error != nil {
		if !c.known(response.Error.Code) ||
			response.Error.PublicMessage == "" ||
			len(response.Error.PublicMessage) > contract.MaxPublicMessageBytes ||
			response.Error.Detail == "" ||
			len(response.Error.Detail) > contract.MaxDetailBytes ||
			response.ResultJSON != "" ||
			response.Stdout != "" {
			return errors.New("invalid python protocol response")
		}
		return nil
	}

	if request.Kind == Health {
		if response.ResultJSON != "" || response.Stdout != "" {
			return errors.New("invalid python protocol response")
		}
		return nil
	}

	if response.ResultJSON == "" ||
		len(response.ResultJSON) > contract.MaxResultBytes ||
		len(response.Stdout) > contract.MaxStdoutBytes ||
		!contract.IsJSONObject(response.ResultJSON) {
		return errors.New("invalid python protocol response")
	}
	return nil
}

func (Codec) known(code contract.Code) bool {
	switch code {
	case contract.InvalidArgument,
		contract.FailedPrecondition,
		contract.Canceled,
		contract.DeadlineExceeded,
		contract.ResourceExhausted,
		contract.Unavailable,
		contract.Internal:
		return true
	}
	return false
}

// Error converts a worker error response into an error with a safe public
// summary and private bounded diagnostic.
func Error(response Response) error {
	if response.Error == nil {
		return nil
	}
	if !(Codec{}).known(response.Error.Code) {
		return contract.InternalError(fmt.Errorf("unknown python worker error code"))
	}

	return contract.New(
		response.Error.Code,
		response.Error.PublicMessage,
		errors.New(response.Error.Detail),
	)
}
