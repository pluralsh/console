package mock_rpc

import (
	"io"

	"go.uber.org/mock/gomock"
	"google.golang.org/protobuf/proto"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

func InitMockClientStream(ctrl *gomock.Controller, eof bool, msgs ...proto.Message) (*MockClientStream, []any) {
	stream := NewMockClientStream(ctrl)
	res := make([]any, 0, len(msgs)+1)
	for _, msg := range msgs {
		call := stream.EXPECT().
			RecvMsg(gomock.Any()).
			Do(testhelpers.RecvMsg(msg))
		res = append(res, call)
	}
	if eof {
		call := stream.EXPECT().
			RecvMsg(gomock.Any()).
			Return(io.EOF)
		res = append(res, call)
	}
	return stream, res
}
