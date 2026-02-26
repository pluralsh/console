package grpctool_test

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strconv"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/prototool"
)

func TestRequestCanceledOrTimedOut(t *testing.T) {
	t.Run("context errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceledOrTimedOut(context.Canceled))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(context.DeadlineExceeded))
		assert.False(t, grpctool.RequestCanceledOrTimedOut(io.EOF))
	})
	t.Run("wrapped context errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceledOrTimedOut(fmt.Errorf("bla: %w", context.Canceled)))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(fmt.Errorf("bla: %w", context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestCanceledOrTimedOut(fmt.Errorf("bla: %w", io.EOF)))
	})
	t.Run("gRPC errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceledOrTimedOut(status.Error(codes.Canceled, "bla")))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(status.Error(codes.DeadlineExceeded, "bla")))
		assert.False(t, grpctool.RequestCanceledOrTimedOut(status.Error(codes.Unavailable, "bla")))
	})
	t.Run("wrapped gRPC errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceledOrTimedOut(fmt.Errorf("bla: %w", status.Error(codes.Canceled, "bla"))))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(fmt.Errorf("bla: %w", status.Error(codes.DeadlineExceeded, "bla"))))
		assert.False(t, grpctool.RequestCanceledOrTimedOut(fmt.Errorf("bla: %w", status.Error(codes.Unavailable, "bla"))))
	})
	t.Run("multierror", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceledOrTimedOut(errors.Join(context.Canceled)))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(errors.Join(context.DeadlineExceeded)))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(errors.Join(context.Canceled, io.EOF)))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(errors.Join(context.DeadlineExceeded, io.EOF)))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(errors.Join(io.EOF, context.Canceled)))
		assert.True(t, grpctool.RequestCanceledOrTimedOut(errors.Join(io.EOF, context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestCanceledOrTimedOut(errors.Join(io.EOF)))
		assert.False(t, grpctool.RequestCanceledOrTimedOut(errors.Join(io.EOF, io.ErrUnexpectedEOF)))
	})
}

func TestRequestCanceled(t *testing.T) {
	t.Run("context errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceled(context.Canceled))
		assert.False(t, grpctool.RequestCanceled(context.DeadlineExceeded))
		assert.False(t, grpctool.RequestCanceled(io.EOF))
	})
	t.Run("wrapped context errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceled(fmt.Errorf("bla: %w", context.Canceled)))
		assert.False(t, grpctool.RequestCanceled(fmt.Errorf("bla: %w", context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestCanceled(fmt.Errorf("bla: %w", io.EOF)))
	})
	t.Run("gRPC errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceled(status.Error(codes.Canceled, "bla")))
		assert.False(t, grpctool.RequestCanceled(status.Error(codes.DeadlineExceeded, "bla")))
		assert.False(t, grpctool.RequestCanceled(status.Error(codes.Unavailable, "bla")))
	})
	t.Run("wrapped gRPC errors", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceled(fmt.Errorf("bla: %w", status.Error(codes.Canceled, "bla"))))
		assert.False(t, grpctool.RequestCanceled(fmt.Errorf("bla: %w", status.Error(codes.DeadlineExceeded, "bla"))))
		assert.False(t, grpctool.RequestCanceled(fmt.Errorf("bla: %w", status.Error(codes.Unavailable, "bla"))))
	})
	t.Run("multierror", func(t *testing.T) {
		assert.True(t, grpctool.RequestCanceled(errors.Join(context.Canceled)))
		assert.False(t, grpctool.RequestCanceled(errors.Join(context.DeadlineExceeded)))
		assert.True(t, grpctool.RequestCanceled(errors.Join(context.Canceled, io.EOF)))
		assert.False(t, grpctool.RequestCanceled(errors.Join(context.DeadlineExceeded, io.EOF)))
		assert.True(t, grpctool.RequestCanceled(errors.Join(io.EOF, context.Canceled)))
		assert.False(t, grpctool.RequestCanceled(errors.Join(io.EOF, context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestCanceled(errors.Join(io.EOF)))
		assert.False(t, grpctool.RequestCanceled(errors.Join(io.EOF, io.ErrUnexpectedEOF)))
	})
}

func TestRequestTimedOut(t *testing.T) {
	t.Run("context errors", func(t *testing.T) {
		assert.False(t, grpctool.RequestTimedOut(context.Canceled))
		assert.True(t, grpctool.RequestTimedOut(context.DeadlineExceeded))
		assert.False(t, grpctool.RequestTimedOut(io.EOF))
	})
	t.Run("wrapped context errors", func(t *testing.T) {
		assert.False(t, grpctool.RequestTimedOut(fmt.Errorf("bla: %w", context.Canceled)))
		assert.True(t, grpctool.RequestTimedOut(fmt.Errorf("bla: %w", context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestTimedOut(fmt.Errorf("bla: %w", io.EOF)))
	})
	t.Run("gRPC errors", func(t *testing.T) {
		assert.False(t, grpctool.RequestTimedOut(status.Error(codes.Canceled, "bla")))
		assert.True(t, grpctool.RequestTimedOut(status.Error(codes.DeadlineExceeded, "bla")))
		assert.False(t, grpctool.RequestTimedOut(status.Error(codes.Unavailable, "bla")))
	})
	t.Run("wrapped gRPC errors", func(t *testing.T) {
		assert.False(t, grpctool.RequestTimedOut(fmt.Errorf("bla: %w", status.Error(codes.Canceled, "bla"))))
		assert.True(t, grpctool.RequestTimedOut(fmt.Errorf("bla: %w", status.Error(codes.DeadlineExceeded, "bla"))))
		assert.False(t, grpctool.RequestTimedOut(fmt.Errorf("bla: %w", status.Error(codes.Unavailable, "bla"))))
	})
	t.Run("multierror", func(t *testing.T) {
		assert.False(t, grpctool.RequestTimedOut(errors.Join(context.Canceled)))
		assert.True(t, grpctool.RequestTimedOut(errors.Join(context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestTimedOut(errors.Join(context.Canceled, io.EOF)))
		assert.True(t, grpctool.RequestTimedOut(errors.Join(context.DeadlineExceeded, io.EOF)))
		assert.False(t, grpctool.RequestTimedOut(errors.Join(io.EOF, context.Canceled)))
		assert.True(t, grpctool.RequestTimedOut(errors.Join(io.EOF, context.DeadlineExceeded)))
		assert.False(t, grpctool.RequestTimedOut(errors.Join(io.EOF)))
		assert.False(t, grpctool.RequestTimedOut(errors.Join(io.EOF, io.ErrUnexpectedEOF)))
	})
}

func TestHandleIoError(t *testing.T) {
	tests := []struct {
		in       error
		expected error
	}{
		{
			in:       status.Error(codes.Canceled, "bla"),
			expected: status.Error(codes.Canceled, "msg: bla"),
		},
		{
			in:       status.Error(codes.DeadlineExceeded, "bla"),
			expected: status.Error(codes.DeadlineExceeded, "msg: bla"),
		},
		{
			in:       status.Error(codes.Internal, "bla"),
			expected: status.Error(codes.Internal, "msg: bla"),
		},
		{
			in:       status.Error(codes.Internal, "bla"),
			expected: status.Error(codes.Internal, "msg: bla"),
		},
		{
			in:       io.EOF,
			expected: status.Error(codes.Canceled, "msg: EOF"),
		},
		{
			in:       io.ErrUnexpectedEOF,
			expected: status.Error(codes.Canceled, "msg: unexpected EOF"),
		},
	}
	for i, tc := range tests {
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			actual := grpctool.HandleIoError("msg", tc.in)
			assert.Equal(t, tc.expected.Error(), actual.Error())
		})
	}
}

func TestStatusErrorFromContext(t *testing.T) {
	canceled, cancel1 := context.WithCancel(context.Background())
	cancel1()
	expired, _ := context.WithDeadline(context.Background(), time.Now().Add(-time.Minute)) // nolint: govet
	tests := []struct {
		ctx         context.Context
		expectedMsg string
	}{
		{
			ctx:         context.Background(),
			expectedMsg: "rpc error: code = Unknown desc = 123: <nil>",
		},
		{
			ctx:         canceled,
			expectedMsg: "rpc error: code = Canceled desc = 123: context canceled",
		},
		{
			ctx:         expired,
			expectedMsg: "rpc error: code = DeadlineExceeded desc = 123: context deadline exceeded",
		},
	}
	for _, tc := range tests {
		t.Run(tc.expectedMsg, func(t *testing.T) {
			err := grpctool.StatusErrorFromContext(tc.ctx, "123")
			assert.EqualError(t, err, tc.expectedMsg)
		})
	}
}

func TestValuesMapToMeta(t *testing.T) {
	tests := []struct {
		input          map[string]*prototool.Values
		expectedOutput metadata.MD
	}{
		{
			input:          nil,
			expectedOutput: nil,
		},
		{
			input:          map[string]*prototool.Values{},
			expectedOutput: nil,
		},
		{
			input: map[string]*prototool.Values{
				"key1": {
					Value: []string{"s1", "s2"},
				},
				"key2": {
					Value: []string{},
				},
				"key3": {
					Value: []string{"s3", "s4"},
				},
			},
			expectedOutput: metadata.MD{
				"key1": []string{"s1", "s2"},
				"key2": []string{},
				"key3": []string{"s3", "s4"},
			},
		},
	}
	for i, tc := range tests {
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			meta := grpctool.ValuesMapToMeta(tc.input)
			assert.Empty(t, cmp.Diff(tc.expectedOutput, meta))
		})
	}
}

func BenchmarkValuesMapToMeta(b *testing.B) {
	input := map[string]*prototool.Values{
		"key1": {
			Value: []string{"s1", "s2"},
		},
		"key2": {
			Value: []string{},
		},
		"key3": {
			Value: []string{"s3", "s4"},
		},
		"key4": {
			Value: []string{"s3", "s4"},
		},
		"key5": {
			Value: []string{"s3", "s4"},
		},
		"key6": {
			Value: []string{"s3", "s4"},
		},
	}
	var sink metadata.MD

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sink = grpctool.ValuesMapToMeta(input)
	}
	_ = sink
}

func TestGrpcHostWithPort(t *testing.T) {
	tests := []struct {
		inUrl               string
		expectedOutHostPort string
	}{
		{
			inUrl:               "grpc://test.test",
			expectedOutHostPort: "test.test:80",
		},
		{
			inUrl:               "grpcs://test.test",
			expectedOutHostPort: "test.test:443",
		},
		{
			inUrl:               "grpc://test.test:123",
			expectedOutHostPort: "test.test:123",
		},
		{
			inUrl:               "grpcs://test.test:123",
			expectedOutHostPort: "test.test:123",
		},
		{
			inUrl:               "grpc://1.2.3.4",
			expectedOutHostPort: "1.2.3.4:80",
		},
		{
			inUrl:               "grpcs://1.2.3.4",
			expectedOutHostPort: "1.2.3.4:443",
		},
		{
			inUrl:               "grpc://[123::123]:123",
			expectedOutHostPort: "[123::123]:123",
		},
		{
			inUrl:               "grpcs://[123::123]:123",
			expectedOutHostPort: "[123::123]:123",
		},
	}
	for _, test := range tests {
		t.Run(test.inUrl, func(t *testing.T) {
			u, err := url.Parse(test.inUrl)
			require.NoError(t, err)
			hostAndPort := grpctool.HostWithPort(u)
			assert.Equal(t, test.expectedOutHostPort, hostAndPort)
		})
	}
}
