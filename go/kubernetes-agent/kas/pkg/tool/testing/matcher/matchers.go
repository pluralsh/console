package matcher

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/google/go-cmp/cmp"
	"go.uber.org/mock/gomock"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/testing/protocmp"
)

var (
	_ gomock.Matcher = &cmpMatcher{}
	_ gomock.Matcher = &errorEqMatcher{}
	_ gomock.Matcher = &grpcOutgoingCtx{}
)

// ProtoEq is a better gomock.Eq() that works correctly for protobuf messages.
// Use this matcher when checking equality of structs that:
// - are v1 protobuf messages (i.e. implement "github.com/golang/protobuf/proto".Message).
// - are v2 protobuf messages (i.e. implement "google.golang.org/protobuf/proto".Message).
// - have fields of the above types.
// See https://blog.golang.org/protobuf-apiv2 for v1 vs v2 details.
func ProtoEq(t *testing.T, msg interface{}, opts ...cmp.Option) gomock.Matcher {
	o := []cmp.Option{protocmp.Transform()}
	o = append(o, opts...)
	return Cmp(t, msg, o...)
}

func ErrorEq(expectedError string) gomock.Matcher {
	return &errorEqMatcher{
		expectedError: expectedError,
	}
}

func ErrorIs(expectedError error) gomock.Matcher {
	return &errorIsMatcher{
		expectedError: expectedError,
	}
}

// func K8sObjectEq(t *testing.T, obj interface{}, opts ...cmp.Option) gomock.Matcher {
//	o := []cmp.Option{kube_testing.TransformToUnstructured(), cmpopts.EquateEmpty()}
//	o = append(o, opts...)
//	return Cmp(t, obj, o...)
// }

func Cmp(t *testing.T, expected interface{}, opts ...cmp.Option) gomock.Matcher {
	return &cmpMatcher{
		t:        t,
		expected: expected,
		options:  opts,
	}
}

type cmpMatcher struct {
	t        *testing.T
	expected interface{}
	options  []cmp.Option
}

func (e cmpMatcher) Matches(x interface{}) bool {
	equal := cmp.Equal(e.expected, x, e.options...)
	if !equal && e.t != nil {
		e.t.Log(cmp.Diff(e.expected, x, e.options...))
	}
	return equal
}

func (e cmpMatcher) String() string {
	return fmt.Sprintf("equals %s with %d option(s)", e.expected, len(e.options))
}

type errorEqMatcher struct {
	expectedError string
}

func (e *errorEqMatcher) Matches(x interface{}) bool {
	if err, ok := x.(error); ok {
		return err.Error() == e.expectedError
	}
	return false
}

func (e *errorEqMatcher) String() string {
	return fmt.Sprintf("error with message %q", e.expectedError)
}

type errorIsMatcher struct {
	expectedError error
}

func (e *errorIsMatcher) Matches(x interface{}) bool {
	if err, ok := x.(error); ok {
		return errors.Is(err, e.expectedError)
	}
	return false
}

func (e *errorIsMatcher) String() string {
	return fmt.Sprintf("error Is(%v)", e.expectedError)
}

type grpcOutgoingCtx struct {
	kv map[string]string
}

// GrpcOutgoingCtx returns a matcher for context.Context that must contain gRPC outgoing metadata
// with certain key-value pairs.
func GrpcOutgoingCtx(kv map[string]string) gomock.Matcher {
	return grpcOutgoingCtx{kv: kv}
}

func (c grpcOutgoingCtx) Matches(x interface{}) bool {
	ctx, ok := x.(context.Context)
	if !ok {
		return false
	}
	md, ok := metadata.FromOutgoingContext(ctx)
	if !ok {
		return false
	}
	for k, v := range c.kv {
		vals := md[k]
		if len(vals) != 1 || vals[0] != v {
			return false
		}
	}
	return true
}

func (c grpcOutgoingCtx) String() string {
	return fmt.Sprintf("context %v", c.kv)
}

// From: https://github.com/golang/mock/issues/43#issuecomment-1292042897
// doMatch keeps state of the custom lambda matcher.
// match is a lambda function that asserts actual value matching.
// x keeps actual value.
type doMatch[V any] struct {
	match func(v V) bool
	x     any
}

// DoMatch creates lambda matcher instance equipped with
// lambda function to detect if actual value matches
// some arbitrary criteria.
// Lambda matcher implements gomock customer matcher
// interface https://github.com/uber/mock/blob/5b455625bd2c8ffbcc0de6a0873f864ba3820904/gomock/matchers.go#L25.
// Sample of usage:
//
// mock.EXPECT().Foo(gomock.All(
//
//	   DoMatch(func(v Bar) bool {
//		      v.Greeting == "Hello world"
//	   }),
//
// ))
func DoMatch[V any](m func(v V) bool) gomock.Matcher {
	return &doMatch[V]{
		match: m,
	}
}

// Matches receives actual value x casts it to specific type defined as a type parameter V
// and calls lambda function 'match' to resolve if x matches or not.
func (o *doMatch[V]) Matches(x any) bool {
	o.x = x
	v, ok := x.(V)
	if !ok {
		return false
	}

	return o.match(v)
}

// String describes what matcher matches.
func (o *doMatch[V]) String() string {
	return fmt.Sprintf("is matched to %v", o.x)
}
