package prototool

import (
	"fmt"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

type ProtoErrMarshaler struct {
}

func (ProtoErrMarshaler) Marshal(err error) ([]byte, error) {
	e, ok := err.(proto.Message) // nolint:errorlint
	if !ok {
		return nil, fmt.Errorf("expected proto.Message, got %T", err) // nolint:errorlint
	}
	return protoMarshal(e)
}

func (ProtoErrMarshaler) Unmarshal(data []byte) (error, error) {
	e, err := protoUnmarshal(data)
	if err != nil {
		return nil, err
	}
	err, ok := e.(error)
	if !ok {
		return nil, fmt.Errorf("expected the proto.Message to be an error but it's not: %T", e)
	}
	return err, nil
}

func protoMarshal(m proto.Message) ([]byte, error) {
	a, err := anypb.New(m) // use Any to capture type information so that a value can be instantiated in protoUnmarshal()
	if err != nil {
		return nil, err
	}
	return proto.Marshal(a)
}

func protoUnmarshal(data []byte) (proto.Message, error) {
	var a anypb.Any
	err := proto.Unmarshal(data, &a)
	if err != nil {
		return nil, err
	}
	return a.UnmarshalNew()
}
