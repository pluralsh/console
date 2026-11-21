package substrate

import (
	"context"
	"strings"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// accessPolicyControl mimics ate-api-server's validation of the singleton access policy name and its members.
type accessPolicyControl struct {
	ateapi.ControlClient
	policy  *ateapi.AccessPolicy
	updates int
}

func validatePolicy(policy *ateapi.AccessPolicy) error {
	if policy.GetMetadata().GetName() != accessPolicyName {
		return status.Error(codes.InvalidArgument, "accessPolicy.metadata.name: Required value")
	}
	for _, b := range policy.GetBindings() {
		for _, m := range b.GetMembers() {
			if id, ok := strings.CutPrefix(m, "user:"); !ok || id == "" {
				return status.Errorf(codes.InvalidArgument, "member %q must have non-empty \"user:<id>\" format", m)
			}
		}
	}
	return nil
}

func (f *accessPolicyControl) GetAtespaceAccessPolicy(_ context.Context, in *ateapi.GetAtespaceAccessPolicyRequest, _ ...grpc.CallOption) (*ateapi.AccessPolicy, error) {
	if in.GetName() != accessPolicyName {
		return nil, status.Error(codes.InvalidArgument, "name: Required value")
	}
	if f.policy == nil {
		return nil, status.Error(codes.NotFound, "not found")
	}
	return f.policy, nil
}

func (f *accessPolicyControl) CreateAtespaceAccessPolicy(_ context.Context, in *ateapi.CreateAtespaceAccessPolicyRequest, _ ...grpc.CallOption) (*ateapi.AccessPolicy, error) {
	if err := validatePolicy(in.GetAccessPolicy()); err != nil {
		return nil, err
	}
	f.policy = in.GetAccessPolicy()
	return f.policy, nil
}

func (f *accessPolicyControl) UpdateAtespaceAccessPolicy(_ context.Context, in *ateapi.UpdateAtespaceAccessPolicyRequest, _ ...grpc.CallOption) (*ateapi.AccessPolicy, error) {
	if err := validatePolicy(in.GetAccessPolicy()); err != nil {
		return nil, err
	}
	f.updates++
	f.policy = in.GetAccessPolicy()
	return f.policy, nil
}

func TestEnsureAtespaceAccessPolicy(t *testing.T) {
	ctx := context.Background()
	control := &accessPolicyControl{}
	client := &Client{control: control}
	gateway := "user:system:serviceaccount:plrl-deploy-operator:devbox-gateway"

	if err := client.EnsureAtespaceAccessPolicy(ctx, "devbox-a", RoleEditor, "system:serviceaccount:plrl-deploy-operator:devbox-gateway"); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("expected a bare principal to be rejected, got %v", err)
	}
	if err := client.EnsureAtespaceAccessPolicy(ctx, "devbox-a", RoleEditor, gateway); err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := client.EnsureAtespaceAccessPolicy(ctx, "devbox-a", RoleEditor, gateway); err != nil {
		t.Fatalf("no-op: %v", err)
	}
	if control.updates != 0 {
		t.Fatalf("expected no update when the binding already exists, got %d", control.updates)
	}
	if err := client.EnsureAtespaceAccessPolicy(ctx, "devbox-a", RoleViewer, "user:alice"); err != nil {
		t.Fatalf("update: %v", err)
	}
	if control.updates != 1 || len(control.policy.GetBindings()) != 2 {
		t.Fatalf("expected one update with two bindings, got %d updates and %v", control.updates, control.policy.GetBindings())
	}
}
