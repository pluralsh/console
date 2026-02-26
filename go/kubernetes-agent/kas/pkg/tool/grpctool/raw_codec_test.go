package grpctool

import (
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/encoding"
	"google.golang.org/protobuf/testing/protocmp"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool/test"
)

var (
	_ encoding.Codec = RawCodec{}
	_ encoding.Codec = RawCodecWithProtoFallback{}
)

func TestRawCodec_Roundtrip(t *testing.T) {
	input := &RawFrame{Data: []byte{1, 2, 3, 4, 5}}
	serialized, err := RawCodec{}.Marshal(input)
	require.NoError(t, err)
	output := &RawFrame{}
	err = RawCodec{}.Unmarshal(serialized, output)
	require.NoError(t, err)
	assert.Equal(t, input, output)
}

func TestRawCodec_BadType(t *testing.T) {
	serialized, err := RawCodec{}.Marshal(&test.Request{})
	require.EqualError(t, err, "RawCodec.Marshal(): unexpected source message type: *test.Request")
	assert.Empty(t, serialized)

	output := &test.Request{}
	err = RawCodec{}.Unmarshal([]byte{1, 2, 3, 4, 5}, output)
	require.EqualError(t, err, "RawCodec.Unmarshal(): unexpected target message type: *test.Request")
}

func TestRawCodecWithProtoFallback_RoundtripRaw(t *testing.T) {
	input := &RawFrame{Data: []byte{1, 2, 3, 4, 5}}
	serialized, err := RawCodecWithProtoFallback{}.Marshal(input)
	require.NoError(t, err)
	output := &RawFrame{}
	err = RawCodecWithProtoFallback{}.Unmarshal(serialized, output)
	require.NoError(t, err)
	assert.Equal(t, input, output)
}

func TestRawCodecWithProtoFallback_RoundtripNonRaw(t *testing.T) {
	input := &test.Request{S1: "bla"}
	serialized, err := RawCodecWithProtoFallback{}.Marshal(input)
	require.NoError(t, err)
	output := &test.Request{}
	err = RawCodecWithProtoFallback{}.Unmarshal(serialized, output)
	require.NoError(t, err)
	assert.Empty(t, cmp.Diff(input, output, protocmp.Transform()))
}
