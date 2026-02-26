package modagent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/textproto"
	"net/url"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"k8s.io/kubectl/pkg/cmd/util"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/entity"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modshared"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
)

const (
	// The field manager name for the ones agentk owns, see
	// https://kubernetes.io/docs/reference/using-api/server-side-apply/#field-management
	FieldManager = "agentk"
)

// Config holds configuration for a Module.
type Config struct {
	// Log can be used for logging from the module.
	// It should not be used for logging from gRPC API methods. Use grpctool.LoggerFromContext(ctx) instead.
	Log       *zap.Logger
	AgentMeta *entity.AgentMeta
	Api       Api
	// K8sUtilFactory provides means to interact with the Kubernetes cluster agentk is running in.
	K8sUtilFactory util.Factory
	// KasConn is the gRPC connection to gitlab-kas.
	KasConn grpc.ClientConnInterface
	// Server is a gRPC server that can be used to expose API endpoints to gitlab-kas and/or GitLab.
	// This can be used to add endpoints in Factory.New.
	// Request handlers can obtain the per-request logger using grpctool.LoggerFromContext(requestContext).
	Server *grpc.Server
	// AgentName is a string "gitlab-agent". Can be used as a user agent, server name, service name, etc.
	AgentName string
	// ServiceAccountName is a string defined by default as "gitlab-agent".
	ServiceAccountName string
}

type GitLabResponse struct {
	Status     string // e.g. "200 OK"
	StatusCode int32  // e.g. 200
	Header     http.Header
	Body       io.ReadCloser
}

// Api provides the API for the module to use.
type Api interface {
	modshared.Api
	GetAgentId(ctx context.Context) (int64, error)
	TryGetAgentId() (int64, bool)
	GetGitLabExternalUrl(ctx context.Context) (url.URL, error)
}

// RpcApi provides the API for the module's gRPC handlers to use.
type RpcApi interface {
	modshared.RpcApi
}

type Factory interface {
	modshared.Factory
	// IsProducingLeaderModules returns if the modules that this Factory produces are leader modules or not.
	// A leader module must only be run once across all agent replicas.
	IsProducingLeaderModules() bool
	// New creates a new instance of a Module.
	New(*Config) (Module, error)
}

type Module interface {
	// Run runs the module.
	// Run must block until the context signals done or the cfg channel is closed. Run must not return before that.
	// cfg is a channel that gets configuration updates sent to it. It's closed when the module should shut down.
	// cfg sends configuration objects that are shared and must not be mutated.
	// Module should make a copy if it needs to mutate the object.
	// Applying configuration may take time, the provided context may signal done if module should shut down.
	// cfg only provides the latest available configuration, intermediate configuration states are discarded.
	// Run is responsible that it acts according to the received configuration, even if that is just to wait for
	// a new one.
	Run(ctx context.Context, cfg <-chan *agentcfg.AgentConfiguration) error
	// DefaultAndValidateConfiguration applies defaults and validates the passed configuration.
	// It is called each time on configuration update before sending it via the channel passed to Run().
	// cfg is a shared instance, module can mutate only the part of it that it owns and only inside of this method.
	DefaultAndValidateConfiguration(cfg *agentcfg.AgentConfiguration) error
	// Name returns module's name.
	Name() string
}

type GitLabRequestConfig struct {
	Method string
	Header http.Header
	Query  url.Values
	Body   io.ReadCloser
}

func defaultRequestConfig() *GitLabRequestConfig {
	return &GitLabRequestConfig{
		Method: http.MethodGet,
		Header: make(http.Header),
		Query:  make(url.Values),
	}
}

func ApplyRequestOptions(opts []GitLabRequestOption) (*GitLabRequestConfig, error) {
	c := defaultRequestConfig()
	var errs []error
	for _, o := range opts {
		err := o(c)
		if err != nil {
			errs = append(errs, err)
		}
	}
	if len(errs) > 0 { // return the error(s) but close the body first
		if c.Body != nil {
			err := c.Body.Close()
			if err != nil {
				errs = append(errs, err)
			}
		}
		return nil, errors.Join(errs...)
	}
	return c, nil
}

type GitLabRequestOption func(*GitLabRequestConfig) error

func WithRequestHeader(header string, values ...string) GitLabRequestOption {
	return func(c *GitLabRequestConfig) error {
		c.Header[textproto.CanonicalMIMEHeaderKey(header)] = values
		return nil
	}
}

func WithRequestQueryParam(key string, values ...string) GitLabRequestOption {
	return func(c *GitLabRequestConfig) error {
		c.Query[key] = values
		return nil
	}
}

// WithRequestBody specifies request body to send and HTTP Content-Type header if contentType is not empty.
// If body implements io.ReadCloser, its Close() method will be called once the data has been sent.
// If body is nil, no body or Content-Type header is sent.
func WithRequestBody(body io.Reader, contentType string) GitLabRequestOption {
	return func(c *GitLabRequestConfig) error {
		if body == nil {
			return nil
		}
		if rc, ok := body.(io.ReadCloser); ok {
			c.Body = rc
		} else {
			c.Body = io.NopCloser(body)
		}
		if contentType != "" {
			c.Header[httpz.ContentTypeHeader] = []string{contentType}
		}
		return nil
	}
}

func WithJsonRequestBody(body interface{}) GitLabRequestOption {
	return func(c *GitLabRequestConfig) error {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("WithJsonRequestBody: %w", err)
		}
		return WithRequestBody(bytes.NewReader(bodyBytes), "application/json")(c)
	}
}

// WithRequestMethod specifies request HTTP method.
func WithRequestMethod(method string) GitLabRequestOption {
	return func(c *GitLabRequestConfig) error {
		c.Method = method
		return nil
	}
}
