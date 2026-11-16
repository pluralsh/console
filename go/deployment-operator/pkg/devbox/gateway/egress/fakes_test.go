package egress

import (
	"context"
	"encoding/base64"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// fakeIngest implements the Ingest RPCs the egress package uses. Unused RPCs panic through the nil embedded
// interface.
type fakeIngest struct {
	devboxv1.IngestClient

	mu sync.Mutex
	// creds answers GetInstanceCredentials; nil means console is down (Unavailable via credsErr).
	creds    func(req *devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error)
	credCall atomic.Int32
	// credGate, when set, blocks GetInstanceCredentials until closed.
	credGate chan struct{}

	reports []*devboxv1.ReportPullRequestRequest
	prs     []*devboxv1.DevboxPullRequestRequest
	prErr   error
}

func (f *fakeIngest) GetInstanceCredentials(ctx context.Context, in *devboxv1.GetInstanceCredentialsRequest, _ ...grpc.CallOption) (*devboxv1.GetInstanceCredentialsResponse, error) {
	f.credCall.Add(1)
	f.mu.Lock()
	gate := f.credGate
	f.mu.Unlock()
	if gate != nil {
		select {
		case <-gate:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	f.mu.Lock()
	fn := f.creds
	f.mu.Unlock()
	return fn(in)
}

func (f *fakeIngest) setCreds(fn func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error)) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.creds = fn
}

func (f *fakeIngest) ReportPullRequest(_ context.Context, in *devboxv1.ReportPullRequestRequest, _ ...grpc.CallOption) (*devboxv1.ReportPullRequestResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.reports = append(f.reports, in)
	return &devboxv1.ReportPullRequestResponse{PullRequestId: "pr-1", Created: true}, nil
}

func (f *fakeIngest) DevboxPullRequest(_ context.Context, in *devboxv1.DevboxPullRequestRequest, _ ...grpc.CallOption) (*devboxv1.DevboxPullRequestResponse, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.prErr != nil {
		return nil, f.prErr
	}
	f.prs = append(f.prs, in)
	n := int64(len(f.prs))
	repo := in.GetAttributes().GetRepository()
	return &devboxv1.DevboxPullRequestResponse{
		PullRequestId: "pr",
		Url:           repo + "/pull/" + itoa(n),
		Number:        n,
	}, nil
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

// tokenCreds returns a credential function minting "tok-<kind>-<n>" tokens valid for ttl from now().
func tokenCreds(now func() time.Time, ttl time.Duration) func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
	var n atomic.Int64
	return func(req *devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
		i := n.Add(1)
		var out []*devboxv1.InstanceCredential
		for _, sel := range req.GetCredentials() {
			out = append(out, &devboxv1.InstanceCredential{
				Kind:      sel.GetKind(),
				Host:      sel.GetHost(),
				Identity:  sel.GetIdentity(),
				Token:     "tok-" + sel.GetKind().String() + "-" + itoa(i),
				ExpiresAt: timestamppb.New(now().Add(ttl)),
			})
		}
		return &devboxv1.GetInstanceCredentialsResponse{Credentials: out}, nil
	}
}

// basicSCMCreds wraps fn so SCM credentials come back the way console sends basic ones: the token pre-encoded as
// base64("<user>:<raw>") with header_format "Basic %s" and scheme metadata.
func basicSCMCreds(user string, fn func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error)) func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
	return func(req *devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
		resp, err := fn(req)
		if err != nil {
			return nil, err
		}
		for _, c := range resp.GetCredentials() {
			if c.GetKind() != devboxv1.CredentialKind_CREDENTIAL_KIND_SCM {
				continue
			}
			c.Token = base64.StdEncoding.EncodeToString([]byte(user + ":" + c.GetToken()))
			c.HeaderFormat = "Basic %s"
			c.Metadata, _ = structpb.NewStruct(map[string]any{"scheme": "basic", "username": user})
		}
		return resp, nil
	}
}

// fakeResolver maps actor IDs to instances.
type fakeResolver struct {
	mu     sync.Mutex
	actors map[string]*InstanceInfo
	err    error
	calls  atomic.Int32
}

func (r *fakeResolver) ResolveActor(_ context.Context, actorID string) (*InstanceInfo, error) {
	r.calls.Add(1)
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.err != nil {
		return nil, r.err
	}
	info, ok := r.actors[actorID]
	if !ok {
		return nil, ErrUnknownActor
	}
	cp := *info
	return &cp, nil
}

// fakeClock is a manually advanced clock.
type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func newFakeClock() *fakeClock { return &fakeClock{t: time.Date(2026, 11, 13, 12, 0, 0, 0, time.UTC)} }

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = c.t.Add(d)
}
