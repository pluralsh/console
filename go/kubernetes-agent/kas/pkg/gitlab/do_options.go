package gitlab

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
)

type ResponseHandler interface {
	// Handle is invoked with HTTP client's response and error values.
	Handle(*http.Response, error) error
	// Accept returns the value to send in the Accept HTTP header.
	// Empty string means no value should be sent.
	Accept() string
}
type ValidatableMessage interface {
	proto.Message
	ValidateAll() error
}

// doConfig holds configuration for the Do call.
type doConfig struct {
	method          string
	path            string
	header          http.Header
	body            io.Reader
	responseHandler ResponseHandler
	withJWT         bool
	noRetry         bool
}

func (c *doConfig) ensureHeaderNotNil() {
	if c.header == nil {
		c.header = make(http.Header)
	}
}

// DoOption to configure the Do call of the client.
type DoOption func(*doConfig) error

func WithMethod(method string) DoOption {
	return func(config *doConfig) error {
		config.method = method
		return nil
	}
}

func WithPath(path string) DoOption {
	return func(config *doConfig) error {
		config.path = path
		return nil
	}
}

func WithJWT(withJWT bool) DoOption {
	return func(config *doConfig) error {
		config.withJWT = withJWT
		return nil
	}
}

func WithJobToken(jobToken string) DoOption {
	return func(config *doConfig) error {
		config.ensureHeaderNotNil()
		config.header["Job-Token"] = []string{jobToken}
		return nil
	}
}

// WithRequestBody sets the request body and HTTP Content-Type header if contentType is not empty.
func WithRequestBody(body io.Reader, contentType string) DoOption {
	return func(config *doConfig) error {
		config.body = body
		if contentType != "" {
			config.ensureHeaderNotNil()
			config.header[httpz.ContentTypeHeader] = []string{contentType}
		}
		return nil
	}
}

// WithProtoJsonRequestBody specifies the object to marshal to JSON and use as request body.
// Use this method with proto messages.
func WithProtoJsonRequestBody(body ValidatableMessage) DoOption {
	return func(config *doConfig) error {
		if err := body.ValidateAll(); err != nil {
			return fmt.Errorf("WithProtoJsonRequestBody: %w", err)
		}
		bodyBytes, err := protojson.Marshal(body)
		if err != nil {
			return fmt.Errorf("WithProtoJsonRequestBody: %w", err)
		}
		return WithRequestBody(bytes.NewReader(bodyBytes), "application/json")(config)
	}
}

// WithJsonRequestBody specifies the object to marshal to JSON and use as request body.
// Do NOT use this method with proto messages, use WithProtoJsonRequestBody instead.
func WithJsonRequestBody(body interface{}) DoOption {
	return func(config *doConfig) error {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("WithJsonRequestBody: %w", err)
		}
		return WithRequestBody(bytes.NewReader(bodyBytes), "application/json")(config)
	}
}

func WithResponseHandler(handler ResponseHandler) DoOption {
	return func(config *doConfig) error {
		config.responseHandler = handler
		accept := handler.Accept()
		if accept != "" {
			config.ensureHeaderNotNil()
			config.header[httpz.AcceptHeader] = []string{accept}
		}
		return nil
	}
}

func WithoutRetries() DoOption {
	return func(config *doConfig) error {
		config.noRetry = true
		return nil
	}
}
