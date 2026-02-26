package grpctool_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"

	grpctool2 "github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
	mock_rpc2 "github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
)

const (
	scalarNumber protoreflect.FieldNumber = 1
	x1Number     protoreflect.FieldNumber = 2
	dataNumber   protoreflect.FieldNumber = 3
	lastNumber   protoreflect.FieldNumber = 4
)

// Test *test.Response as callback parameter type
func TestStreamVisitorMessageHappyPath(t *testing.T) {
	stream := setupStream(t)

	var (
		scalarCalled int
		x1Called     int
		dataCalled   int
		lastCalled   int
		eofCalled    int
	)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)
	err = v.Visit(stream,
		grpctool2.WithEOFCallback(func() error {
			eofCalled++
			return nil
		}),
		grpctool2.WithCallback(scalarNumber, func(message *test.Response) error {
			scalarCalled++
			return nil
		}),
		grpctool2.WithCallback(x1Number, func(message *test.Response) error {
			x1Called++
			return nil
		}),
		grpctool2.WithCallback(dataNumber, func(message *test.Response) error {
			dataCalled++
			return nil
		}),
		grpctool2.WithCallback(lastNumber, func(message *test.Response) error {
			lastCalled++
			return nil
		}),
	)
	require.NoError(t, err)
	assert.Equal(t, 1, scalarCalled)
	assert.Equal(t, 1, x1Called)
	assert.Equal(t, 2, dataCalled)
	assert.Equal(t, 1, lastCalled)
	assert.Equal(t, 1, eofCalled)
}

// Test field types as callback parameter type.
func TestStreamVisitorFieldHappyPath(t *testing.T) {
	stream := setupStream(t)

	var (
		scalarCalled int
		x1Called     int
		dataCalled   int
		lastCalled   int
		eofCalled    int
	)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)
	err = v.Visit(stream,
		grpctool2.WithEOFCallback(func() error {
			eofCalled++
			return nil
		}),
		grpctool2.WithCallback(scalarNumber, func(scalar int64) error {
			scalarCalled++
			return nil
		}),
		grpctool2.WithCallback(x1Number, func(x1 test.Enum1) error {
			x1Called++
			return nil
		}),
		grpctool2.WithCallback(dataNumber, func(data *test.Response_Data) error {
			dataCalled++
			return nil
		}),
		grpctool2.WithCallback(lastNumber, func(last *test.Response_Last) error {
			lastCalled++
			return nil
		}),
	)
	require.NoError(t, err)
	assert.Equal(t, 1, scalarCalled)
	assert.Equal(t, 1, x1Called)
	assert.Equal(t, 2, dataCalled)
	assert.Equal(t, 1, lastCalled)
	assert.Equal(t, 1, eofCalled)
}

// Test mixed types as callback parameter type.
func TestStreamVisitorMixedHappyPath(t *testing.T) {
	stream := setupStream(t)

	var (
		scalarCalled int
		x1Called     int
		dataCalled   int
		lastCalled   int
		eofCalled    int
	)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)
	err = v.Visit(stream,
		grpctool2.WithEOFCallback(func() error {
			eofCalled++
			return nil
		}),
		grpctool2.WithCallback(scalarNumber, func(message proto.Message) error {
			scalarCalled++
			return nil
		}),
		grpctool2.WithCallback(x1Number, func(x1 test.Enum1) error {
			x1Called++
			return nil
		}),
		grpctool2.WithCallback(dataNumber, func(data interface{ GetData() []byte }) error {
			dataCalled++
			return nil
		}),
		grpctool2.WithCallback(lastNumber, func(last interface{}) error {
			lastCalled++
			return nil
		}),
	)
	require.NoError(t, err)
	assert.Equal(t, 1, scalarCalled)
	assert.Equal(t, 1, x1Called)
	assert.Equal(t, 2, dataCalled)
	assert.Equal(t, 1, lastCalled)
	assert.Equal(t, 1, eofCalled)
}

func TestStreamVisitorCustomStartState(t *testing.T) {
	ctrl := gomock.NewController(t)
	stream, calls := mock_rpc2.InitMockClientStream(ctrl, true,
		&test.Response{
			Message: &test.Response_Last_{
				Last: &test.Response_Last{},
			},
		},
	)
	gomock.InOrder(calls...)

	var (
		scalarCalled int
		x1Called     int
		dataCalled   int
		lastCalled   int
		eofCalled    int
	)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)
	err = v.Visit(stream,
		grpctool2.WithEOFCallback(func() error {
			eofCalled++
			return nil
		}),
		grpctool2.WithCallback(scalarNumber, func(message proto.Message) error {
			scalarCalled++
			return nil
		}),
		grpctool2.WithCallback(x1Number, func(x1 test.Enum1) error {
			x1Called++
			return nil
		}),
		grpctool2.WithCallback(dataNumber, func(data interface{ GetData() []byte }) error {
			dataCalled++
			return nil
		}),
		grpctool2.WithCallback(lastNumber, func(last interface{}) error {
			lastCalled++
			return nil
		}),
		grpctool2.WithStartState(dataNumber),
	)
	require.NoError(t, err)
	assert.Zero(t, scalarCalled)
	assert.Zero(t, x1Called)
	assert.Zero(t, dataCalled)
	assert.Equal(t, 1, lastCalled)
	assert.Equal(t, 1, eofCalled)
}

func setupStream(t *testing.T) *mock_rpc2.MockClientStream {
	ctrl := gomock.NewController(t)
	stream, calls := mock_rpc2.InitMockClientStream(ctrl, true,
		&test.Response{
			Message: &test.Response_Scalar{
				Scalar: 123,
			},
		},
		&test.Response{
			Message: &test.Response_X1{
				X1: test.Enum1_v1,
			},
		},
		&test.Response{
			Message: &test.Response_Data_{
				Data: &test.Response_Data{},
			},
		},
		&test.Response{
			Message: &test.Response_Data_{
				Data: &test.Response_Data{},
			},
		},
		&test.Response{
			Message: &test.Response_Last_{
				Last: &test.Response_Last{},
			},
		},
	)
	gomock.InOrder(calls...)
	return stream
}

func TestStreamVisitorHappyPathNoEof(t *testing.T) {
	ctrl := gomock.NewController(t)
	stream, calls := mock_rpc2.InitMockClientStream(ctrl, true,
		&test.Response{
			Message: &test.Response_Scalar{
				Scalar: 234,
			},
		},
		&test.Response{
			Message: &test.Response_X1{
				X1: test.Enum1_v1,
			},
		},
		&test.Response{
			Message: &test.Response_Data_{
				Data: &test.Response_Data{},
			},
		},
		&test.Response{
			Message: &test.Response_Last_{
				Last: &test.Response_Last{},
			},
		},
	)
	gomock.InOrder(calls...)

	var (
		scalarCalled int
		x1Called     int
		dataCalled   int
		lastCalled   int
	)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)
	err = v.Visit(stream,
		grpctool2.WithCallback(scalarNumber, func(message *test.Response) error {
			scalarCalled++
			return nil
		}),
		grpctool2.WithCallback(x1Number, func(x1 test.Enum1) error {
			x1Called++
			return nil
		}),
		grpctool2.WithCallback(dataNumber, func(message *test.Response) error {
			dataCalled++
			return nil
		}),
		grpctool2.WithCallback(lastNumber, func(message *test.Response) error {
			lastCalled++
			return nil
		}),
	)
	require.NoError(t, err)
	assert.Equal(t, 1, scalarCalled)
	assert.Equal(t, 1, x1Called)
	assert.Equal(t, 1, dataCalled)
	assert.Equal(t, 1, lastCalled)
}

func TestStreamVisitorReachableMissingCallback(t *testing.T) {
	ctrl := gomock.NewController(t)
	stream := mock_rpc2.NewMockClientStream(ctrl)

	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)

	err = v.Visit(stream)
	require.EqualError(t, err, "rpc error: code = Internal desc = no callback defined for field plural.agent.grpctool.test.Response.scalar (1)")
}

func TestStreamingVisitorUnreachableMissingCallback(t *testing.T) {
	ctrl := gomock.NewController(t)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)

	// we will use start state x1Number, comment out "missing" start state entries for clarity

	stream, calls := mock_rpc2.InitMockClientStream(ctrl, true,
		// /* skip (pretend it is already processed) */ &test.Response{Message: &test.Response_Scalar{Scalar: 123}},
		// /* skip (pretend it is already processed) */ &test.Response{Message: &test.Response_X1{X1: test.Enum1_v1}},
		&test.Response{Message: &test.Response_Data_{Data: &test.Response_Data{}}},
		&test.Response{Message: &test.Response_Last_{Last: &test.Response_Last{}}},
	)
	gomock.InOrder(calls...)

	err = v.Visit(stream,
		grpctool2.WithStartState(x1Number),
		// /* skip (because unreachable) */ grpctool.WithCallback(scalarNumber, func(message *test.Response) error { return nil }),
		// /* skip (because unreachable) */ grpctool.WithCallback(x1Number, func(message *test.Response) error { return nil }),
		grpctool2.WithCallback(dataNumber, func(message *test.Response) error { return nil }),
		grpctool2.WithCallback(lastNumber, func(message *test.Response) error { return nil }),
	)
	require.NoError(t, err)
}

func TestStreamVisitor_UnexpectedFieldReceived(t *testing.T) {
	ctrl := gomock.NewController(t)
	stream, calls := mock_rpc2.InitMockClientStream(ctrl, false,
		&test.Response{
			Message: &test.Response_Scalar{},
		},
	)
	gomock.InOrder(calls...)

	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)

	err = v.Visit(stream, grpctool2.WithNotExpectingToGet(codes.DataLoss, scalarNumber, x1Number, dataNumber, lastNumber))
	require.EqualError(t, err, "rpc error: code = DataLoss desc = unexpected field number received: 1")
}

func TestStreamVisitor_WithNotExpectingToGet_HappyPath(t *testing.T) {
	ctrl := gomock.NewController(t)
	stream, calls := mock_rpc2.InitMockClientStream(ctrl, true,
		&test.Response{
			Message: &test.Response_Last_{},
		},
	)
	gomock.InOrder(calls...)

	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)

	err = v.Visit(stream,
		grpctool2.WithStartState(dataNumber),
		// even though WithStartState(dataNumber), dataNumber is still required because there is dataNumber -> dataNumber transition
		grpctool2.WithNotExpectingToGet(codes.DataLoss, dataNumber),
		grpctool2.WithCallback(lastNumber, func(l *test.Response_Last) error { return nil }))
	require.NoError(t, err)
}

func TestStreamVisitorNoOneofs(t *testing.T) {
	_, err := grpctool2.NewStreamVisitor(&test.NoOneofs{})
	require.EqualError(t, err, "one oneof group is expected in plural.agent.grpctool.test.NoOneofs, 0 defined")
}

func TestStreamVisitorTwoOneofs(t *testing.T) {
	_, err := grpctool2.NewStreamVisitor(&test.TwoOneofs{})
	require.EqualError(t, err, "one oneof group is expected in plural.agent.grpctool.test.TwoOneofs, 2 defined")
}

func TestStreamVisitorTwoValidOneofs(t *testing.T) {
	_, err := grpctool2.NewStreamVisitor(&test.TwoValidOneofs{})
	require.EqualError(t, err, "one oneof group is expected in plural.agent.grpctool.test.TwoValidOneofs, 2 defined")
}

func TestStreamVisitorNumberOutOfOneof(t *testing.T) {
	_, err := grpctool2.NewStreamVisitor(&test.OutOfOneof{})
	require.EqualError(t, err, "field number 1 is not part of oneof plural.agent.grpctool.test.OutOfOneof.message")
}

func TestStreamVisitorNotAllFieldsReachable(t *testing.T) {
	_, err := grpctool2.NewStreamVisitor(&test.NotAllReachable{})
	require.EqualError(t, err, "unreachable fields in oneof plural.agent.grpctool.test.NotAllReachable.message: [1 2]")
}

func TestStreamVisitorInvalidNumber(t *testing.T) {
	ctrl := gomock.NewController(t)
	stream := mock_rpc2.NewMockClientStream(ctrl)
	v, err := grpctool2.NewStreamVisitor(&test.Response{})
	require.NoError(t, err)
	cb := func(message *test.Response) error {
		return nil
	}
	err = v.Visit(stream,
		grpctool2.WithCallback(scalarNumber, cb),
		grpctool2.WithCallback(x1Number, cb),
		grpctool2.WithCallback(dataNumber, cb),
		grpctool2.WithCallback(lastNumber, cb),
		grpctool2.WithCallback(20, cb),
	)
	require.EqualError(t, err, "rpc error: code = Internal desc = oneof plural.agent.grpctool.test.Response.message does not have a field 20")
}
