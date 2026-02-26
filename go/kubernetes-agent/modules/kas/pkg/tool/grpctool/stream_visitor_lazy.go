package grpctool

import (
	"sync"

	"google.golang.org/protobuf/proto"
)

type LazyStreamVisitor struct {
	streamMessage proto.Message
	once          sync.Once
	sv            *StreamVisitor
}

func NewLazyStreamVisitor(streamMessage proto.Message) *LazyStreamVisitor {
	return &LazyStreamVisitor{
		streamMessage: streamMessage,
	}
}

func (v *LazyStreamVisitor) Get() *StreamVisitor {
	v.once.Do(func() {
		var err error
		v.sv, err = NewStreamVisitor(v.streamMessage)
		if err != nil {
			panic(err) // this will never panic as long as the proto file is correct
		}
	})
	return v.sv
}
