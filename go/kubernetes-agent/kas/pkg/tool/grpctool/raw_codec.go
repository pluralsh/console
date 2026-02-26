package grpctool

import (
	"fmt"

	protoenc "google.golang.org/grpc/encoding/proto"
	"google.golang.org/protobuf/proto"
)

type RawFrame struct {
	Data []byte
}

// RawCodec is a *raw* encoding.Codec.
// This codec treats a gRPC message frame as raw bytes.
type RawCodec struct {
}

func (c RawCodec) Marshal(v interface{}) ([]byte, error) {
	out, ok := v.(*RawFrame)
	if !ok {
		return nil, fmt.Errorf("RawCodec.Marshal(): unexpected source message type: %T", v)
	}
	return out.Data, nil
}

func (c RawCodec) Unmarshal(data []byte, v interface{}) error {
	dst, ok := v.(*RawFrame)
	if !ok {
		return fmt.Errorf("RawCodec.Unmarshal(): unexpected target message type: %T", v)
	}
	dst.Data = data
	return nil
}

func (c RawCodec) Name() string {
	// Pretend to be a codec for protobuf.
	return protoenc.Name
}

// RawCodecWithProtoFallback is a *raw* encoding.Codec.
// This codec treats a gRPC message as raw bytes if it's RawFrame and falls back to default proto encoding
// for other message types.
type RawCodecWithProtoFallback struct {
}

func (c RawCodecWithProtoFallback) Marshal(v interface{}) ([]byte, error) {
	out, ok := v.(*RawFrame)
	if !ok {
		// Only works for v2 messages.
		return proto.Marshal(v.(proto.Message))
	}
	return out.Data, nil
}

func (c RawCodecWithProtoFallback) Unmarshal(data []byte, v interface{}) error {
	dst, ok := v.(*RawFrame)
	if !ok {
		// Only works for v2 messages.
		return proto.Unmarshal(data, v.(proto.Message))
	}
	dst.Data = data
	return nil
}

func (c RawCodecWithProtoFallback) Name() string {
	// Pretend to be a codec for protobuf.
	return protoenc.Name
}
