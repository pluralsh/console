package worker

import (
	"context"
	"errors"
	"io"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/protocol"
)

type runtime interface {
	Health() error
	Run(context.Context, string, string) (*contract.RunOutput, error)
}

// Server processes private protocol requests using one restricted runtime.
type Server struct {
	runtime runtime
	codec   protocol.Codec
}

// NewServer creates a server backed by the restricted Monty runtime.
func NewServer() *Server {
	return newServer(newMontyRuntime())
}

func newServer(runtime runtime) *Server {
	return &Server{runtime: runtime, codec: protocol.NewCodec(protocol.MaxFrameSize)}
}

// Run processes protocol requests until input reaches EOF or a protocol or I/O
// failure occurs. It returns only private diagnostics to its caller.
func (s *Server) Run(in io.Reader, out io.Writer) error {
	for {
		request, err := s.codec.ReadRequest(in)
		if errors.Is(err, io.EOF) {
			return nil
		}
		if err != nil {
			return contract.InternalError(err)
		}

		response := protocol.Response{
			Version: protocol.Version,
			Kind:    request.Kind,
			ID:      request.ID,
		}

		switch request.Kind {
		case protocol.Health:
			err = s.runtime.Health()
		case protocol.Run:
			var result *contract.RunOutput
			result, err = s.runtime.Run(context.Background(), request.Script, request.InputJSON)
			if err == nil {
				response.ResultJSON = result.ResultJSON
				response.Stdout = result.Stdout
			}
		default:
			err = contract.InternalError(errors.New("unreachable protocol kind"))
		}

		if err != nil {
			response.Error = &protocol.WireError{
				Code:          contract.CodeOf(err),
				PublicMessage: contract.PublicMessage(err),
				Detail:        contract.Detail(err),
			}
		}

		if err := s.codec.WriteResponse(out, request, response); err != nil {
			return contract.InternalError(err)
		}
	}
}
