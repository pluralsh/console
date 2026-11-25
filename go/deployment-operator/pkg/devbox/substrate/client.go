// Package substrate is a thin client for the Agent Substrate control API (substrate.ateapi.v1.Control),
// used by the DevboxRunner controller and the devbox gateway.
//
// The protobuf bindings in ./ateapi are vendored from go.ate.dev/substrate@v1.0.0 (see `make substrate-proto`)
// rather than imported, since that module forces k8s.io/* v0.37 and otel upgrades on the operator module.
// Both register the proto package substrate.ateapi.v1, so never link go.ate.dev/substrate/api/ateapi/v1 into
// the same binary as this package.
package substrate

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	// DefaultAddress is the in-cluster ate-api-server address.
	DefaultAddress = "api.ate-system.svc:443"
	// TokenAudience is the audience of the projected ServiceAccount token ate-api-server accepts.
	TokenAudience = "api.ate-system.svc"
	// PreviewHeader opts a request into Substrate preview features such as GoldenEgressPolicy.
	PreviewHeader = "Ate-Preview-Allowed"

	RoleOwner  = "owner"
	RoleEditor = "editor"
	RoleViewer = "viewer"

	// accessPolicyName is the name of every access policy, a singleton under its parent.
	accessPolicyName = "default"

	pageSize = 500
)

// API is the subset of the Control service the devbox components use. Every method is idempotent:
// creates return the existing object on AlreadyExists, deletes treat NotFound as success.
type API interface {
	EnsureAtespace(ctx context.Context, name string) error
	DeleteAtespace(ctx context.Context, name string) error
	// EnsureAtespaceAccessPolicy makes sure every member holds the given role, keeping existing bindings.
	EnsureAtespaceAccessPolicy(ctx context.Context, atespace, role string, members ...string) error
	// EnsureGlobalAccessPolicy is EnsureAtespaceAccessPolicy for the install-wide policy.
	EnsureGlobalAccessPolicy(ctx context.Context, role string, members ...string) error

	CreateActorTemplate(ctx context.Context, template *ateapi.ActorTemplate, preview bool) (*ateapi.ActorTemplate, error)
	GetActorTemplate(ctx context.Context, atespace, name string) (*ateapi.ActorTemplate, error)
	ListActorTemplates(ctx context.Context, atespace string) ([]*ateapi.ActorTemplate, error)
	DeleteActorTemplate(ctx context.Context, atespace, name string) error

	ListActors(ctx context.Context, atespace string) ([]*ateapi.Actor, error)
	DeleteActor(ctx context.Context, atespace, name string) error

	ListTags(ctx context.Context, atespace string) ([]*ateapi.Tag, error)
	DeleteTag(ctx context.Context, atespace, name string) error

	ListWorkers(ctx context.Context) ([]*ateapi.Worker, error)
	// DrainWorker stops new actors being placed on the worker. Draining is one-way, and actors already bound
	// to the worker stay.
	DrainWorker(ctx context.Context, name string) (*ateapi.Worker, error)
}

// Config locates ate-api-server and the credentials used to reach it.
type Config struct {
	// Address of ate-api-server, defaults to DefaultAddress.
	Address string
	// TokenFile is a projected ServiceAccount token with audience TokenAudience. It is re-read on every call,
	// so kubelet rotation is picked up.
	TokenFile string
	// CAFile is the trust bundle of the servicedns.podcert.ate.dev signer.
	CAFile string
	// ServerName overrides the TLS server name, defaults to the host of Address.
	ServerName string
}

type Client struct {
	conn    *grpc.ClientConn
	control ateapi.ControlClient
}

var _ API = &Client{}

func Dial(cfg Config) (*Client, error) {
	ca, err := os.ReadFile(cfg.CAFile)
	if err != nil {
		return nil, fmt.Errorf("reading substrate CA bundle: %w", err)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(ca) {
		return nil, fmt.Errorf("no certificates in substrate CA bundle %s", cfg.CAFile)
	}
	return DialWith(cfg.Address, cfg.ServerName, pool, tokenFileCredentials(cfg.TokenFile))
}

// DialWith connects to ate-api-server at address (DefaultAddress when empty), verifying it against roots and
// authenticating every call with creds. serverName defaults to the host of address.
func DialWith(address, serverName string, roots *x509.CertPool, creds credentials.PerRPCCredentials) (*Client, error) {
	if address == "" {
		address = DefaultAddress
	}
	if serverName == "" {
		serverName = strings.Split(address, ":")[0]
	}

	conn, err := grpc.NewClient(address,
		grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{RootCAs: roots, ServerName: serverName, MinVersion: tls.VersionTLS12})),
		grpc.WithPerRPCCredentials(creds),
	)
	if err != nil {
		return nil, err
	}

	return NewFromConn(conn), nil
}

func NewFromConn(conn *grpc.ClientConn) *Client {
	return &Client{conn: conn, control: ateapi.NewControlClient(conn)}
}

func (c *Client) Close() error {
	return c.conn.Close()
}

type tokenFileCredentials string

func (t tokenFileCredentials) GetRequestMetadata(_ context.Context, _ ...string) (map[string]string, error) {
	token, err := os.ReadFile(string(t))
	if err != nil {
		return nil, fmt.Errorf("reading substrate token: %w", err)
	}
	return map[string]string{"authorization": "Bearer " + strings.TrimSpace(string(token))}, nil
}

func (t tokenFileCredentials) RequireTransportSecurity() bool {
	return true
}

func IsNotFound(err error) bool {
	return status.Code(err) == codes.NotFound
}

func IsAlreadyExists(err error) bool {
	return status.Code(err) == codes.AlreadyExists
}

func ignoreNotFound(err error) error {
	if IsNotFound(err) {
		return nil
	}
	return err
}

func (c *Client) EnsureAtespace(ctx context.Context, name string) error {
	_, err := c.control.GetAtespace(ctx, &ateapi.GetAtespaceRequest{Atespace: &ateapi.ObjectRef{Name: name}})
	if err == nil {
		return nil
	}
	if !IsNotFound(err) {
		return err
	}

	_, err = c.control.CreateAtespace(ctx, &ateapi.CreateAtespaceRequest{
		Atespace: &ateapi.Atespace{Metadata: &ateapi.ResourceMetadata{Name: name}},
	})
	if IsAlreadyExists(err) {
		return nil
	}
	return err
}

func (c *Client) DeleteAtespace(ctx context.Context, name string) error {
	_, err := c.control.DeleteAtespace(ctx, &ateapi.DeleteAtespaceRequest{Atespace: &ateapi.ObjectRef{Name: name}})
	return ignoreNotFound(err)
}

func (c *Client) EnsureAtespaceAccessPolicy(ctx context.Context, atespace, role string, members ...string) error {
	ref := &ateapi.ObjectRef{Name: atespace}
	get := &ateapi.GetAtespaceAccessPolicyRequest{Atespace: ref, Name: accessPolicyName}
	policy, err := c.control.GetAtespaceAccessPolicy(ctx, get)
	if IsNotFound(err) {
		_, err = c.control.CreateAtespaceAccessPolicy(ctx, &ateapi.CreateAtespaceAccessPolicyRequest{
			Atespace: ref,
			AccessPolicy: &ateapi.AccessPolicy{
				Metadata: &ateapi.ResourceMetadata{Name: accessPolicyName},
				Bindings: []*ateapi.Binding{{Role: role, Members: members}},
			},
		})
		if !IsAlreadyExists(err) {
			return err
		}
		policy, err = c.control.GetAtespaceAccessPolicy(ctx, get)
	}
	if err != nil {
		return err
	}

	if !MergeBinding(policy, role, members...) {
		return nil
	}
	_, err = c.control.UpdateAtespaceAccessPolicy(ctx, &ateapi.UpdateAtespaceAccessPolicyRequest{Atespace: ref, AccessPolicy: policy})
	return err
}

func (c *Client) EnsureGlobalAccessPolicy(ctx context.Context, role string, members ...string) error {
	get := &ateapi.GetGlobalAccessPolicyRequest{Name: accessPolicyName}
	policy, err := c.control.GetGlobalAccessPolicy(ctx, get)
	if IsNotFound(err) {
		_, err = c.control.CreateGlobalAccessPolicy(ctx, &ateapi.CreateGlobalAccessPolicyRequest{
			AccessPolicy: &ateapi.AccessPolicy{
				Metadata: &ateapi.ResourceMetadata{Name: accessPolicyName},
				Bindings: []*ateapi.Binding{{Role: role, Members: members}},
			},
		})
		if !IsAlreadyExists(err) {
			return err
		}
		policy, err = c.control.GetGlobalAccessPolicy(ctx, get)
	}
	if err != nil {
		return err
	}

	if !MergeBinding(policy, role, members...) {
		return nil
	}
	_, err = c.control.UpdateGlobalAccessPolicy(ctx, &ateapi.UpdateGlobalAccessPolicyRequest{AccessPolicy: policy})
	return err
}

// MergeBinding adds the members to the role's binding, returning whether the policy changed.
func MergeBinding(policy *ateapi.AccessPolicy, role string, members ...string) bool {
	var binding *ateapi.Binding
	for _, b := range policy.GetBindings() {
		if b.GetRole() == role {
			binding = b
			break
		}
	}
	if binding == nil {
		binding = &ateapi.Binding{Role: role}
		policy.Bindings = append(policy.Bindings, binding)
	}

	changed := false
	for _, m := range members {
		found := false
		for _, existing := range binding.Members {
			if existing == m {
				found = true
				break
			}
		}
		if !found {
			binding.Members = append(binding.Members, m)
			changed = true
		}
	}
	return changed
}

func (c *Client) CreateActorTemplate(ctx context.Context, template *ateapi.ActorTemplate, preview bool) (*ateapi.ActorTemplate, error) {
	if preview {
		ctx = metadata.AppendToOutgoingContext(ctx, PreviewHeader, "true")
	}
	created, err := c.control.CreateActorTemplate(ctx, &ateapi.CreateActorTemplateRequest{ActorTemplate: template})
	if IsAlreadyExists(err) {
		return c.GetActorTemplate(ctx, template.GetMetadata().GetAtespace(), template.GetMetadata().GetName())
	}
	return created, err
}

func (c *Client) GetActorTemplate(ctx context.Context, atespace, name string) (*ateapi.ActorTemplate, error) {
	return c.control.GetActorTemplate(ctx, &ateapi.GetActorTemplateRequest{ActorTemplate: &ateapi.ObjectRef{Atespace: atespace, Name: name}})
}

func (c *Client) ListActorTemplates(ctx context.Context, atespace string) ([]*ateapi.ActorTemplate, error) {
	var out []*ateapi.ActorTemplate
	token := ""
	for {
		res, err := c.control.ListActorTemplates(ctx, &ateapi.ListActorTemplatesRequest{
			Atespace: atespace, Options: &ateapi.ListOptions{PageSize: pageSize, PageToken: token},
		})
		if err != nil {
			return nil, err
		}
		out = append(out, res.GetActorTemplates()...)
		if token = res.GetNextPageToken(); token == "" {
			return out, nil
		}
	}
}

func (c *Client) DeleteActorTemplate(ctx context.Context, atespace, name string) error {
	_, err := c.control.DeleteActorTemplate(ctx, &ateapi.DeleteActorTemplateRequest{ActorTemplate: &ateapi.ObjectRef{Atespace: atespace, Name: name}})
	return ignoreNotFound(err)
}

func (c *Client) ListActors(ctx context.Context, atespace string) ([]*ateapi.Actor, error) {
	var out []*ateapi.Actor
	token := ""
	for {
		res, err := c.control.ListActors(ctx, &ateapi.ListActorsRequest{
			Atespace: atespace, Options: &ateapi.ListOptions{PageSize: pageSize, PageToken: token},
		})
		if err != nil {
			return nil, err
		}
		out = append(out, res.GetActors()...)
		if token = res.GetNextPageToken(); token == "" {
			return out, nil
		}
	}
}

func (c *Client) DeleteActor(ctx context.Context, atespace, name string) error {
	_, err := c.control.DeleteActor(ctx, &ateapi.DeleteActorRequest{Actor: &ateapi.ObjectRef{Atespace: atespace, Name: name}})
	return ignoreNotFound(err)
}

func (c *Client) ListTags(ctx context.Context, atespace string) ([]*ateapi.Tag, error) {
	var out []*ateapi.Tag
	token := ""
	for {
		res, err := c.control.ListTags(ctx, &ateapi.ListTagsRequest{
			Atespace: atespace, Options: &ateapi.ListOptions{PageSize: pageSize, PageToken: token},
		})
		if err != nil {
			return nil, err
		}
		out = append(out, res.GetTags()...)
		if token = res.GetNextPageToken(); token == "" {
			return out, nil
		}
	}
}

func (c *Client) DeleteTag(ctx context.Context, atespace, name string) error {
	_, err := c.control.DeleteTag(ctx, &ateapi.DeleteTagRequest{Tag: &ateapi.ObjectRef{Atespace: atespace, Name: name}})
	return ignoreNotFound(err)
}

func (c *Client) ListWorkers(ctx context.Context) ([]*ateapi.Worker, error) {
	var out []*ateapi.Worker
	token := ""
	for {
		res, err := c.control.ListWorkers(ctx, &ateapi.ListWorkersRequest{
			Options: &ateapi.ListOptions{PageSize: pageSize, PageToken: token},
		})
		if err != nil {
			return nil, err
		}
		out = append(out, res.GetWorkers()...)
		if token = res.GetNextPageToken(); token == "" {
			return out, nil
		}
	}
}

func (c *Client) DrainWorker(ctx context.Context, name string) (*ateapi.Worker, error) {
	res, err := c.control.DrainWorker(ctx, &ateapi.DrainWorkerRequest{Worker: &ateapi.ObjectRef{Name: name}})
	if err != nil {
		return nil, err
	}
	return res.GetWorker(), nil
}
