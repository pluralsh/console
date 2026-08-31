package protocol

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
)

func TestCodecRejectsMalformedAndInvalidResponses(t *testing.T) {
	codec := NewCodec(128)
	invalidBodies := [][]byte{
		nil,
		[]byte(`{"version":1,"kind":"health","id":"x","extra":true}`),
		[]byte(`{"version":2,"kind":"health","id":"x"}`),
	}
	for _, body := range invalidBodies {
		var input bytes.Buffer
		var header [4]byte
		binary.BigEndian.PutUint32(header[:], uint32(len(body)))
		input.Write(header[:])
		input.Write(body)
		if _, err := codec.ReadRequest(&input); err == nil {
			t.Fatal("accepted invalid request")
		}
	}
	request := Request{Version: Version, Kind: Run, ID: "x", Script: "output={}", InputJSON: "{}"}
	response := Response{
		Version: Version,
		Kind:    Run,
		ID:      "x",
		Error: &WireError{
			Code:          contract.Internal,
			PublicMessage: "python runtime failed",
			Detail:        "private",
		},
	}
	if err := codec.WriteResponse(&bytes.Buffer{}, request, response); err != nil {
		t.Fatal(err)
	}
	if Public := Error(response); contract.PublicMessage(Public) != "python runtime failed" {
		t.Fatal("private detail leaked")
	}
}

func TestCodecFrameAndSemanticInvariants(t *testing.T) {
	codec := NewCodec(MaxFrameSize)
	request := Request{Version: Version, Kind: Run, ID: "request", Script: "output={}", InputJSON: "{}"}
	for _, body := range [][]byte{
		[]byte(`{"version":1,"kind":"unknown","id":"request"}`),
		[]byte(`{"version":1,"kind":"run","id":"request","script":"","input_json":"{}"}`),
		[]byte(`{"version":1,"kind":"health","id":"request","script":"x"}`),
		[]byte(`{"version":1,"kind":"run","id":"request","script":"output={}","input_json":"{}"} {}`),
	} {
		if _, err := codec.ReadRequest(frame(body)); err == nil {
			t.Fatalf("accepted request %s", body)
		}
	}
	for _, response := range []Response{
		{Version: 2, Kind: Run, ID: request.ID, ResultJSON: "{}"},
		{Version: Version, Kind: Health, ID: request.ID, ResultJSON: "{}"},
		{Version: Version, Kind: Run, ID: "other", ResultJSON: "{}"},
		{
			Version:    Version,
			Kind:       Run,
			ID:         request.ID,
			ResultJSON: "{}",
			Error: &WireError{
				Code:          contract.Internal,
				PublicMessage: "python runtime failed",
				Detail:        "x",
			},
		},
		{Version: Version, Kind: Run, ID: request.ID, Error: &WireError{Code: contract.Internal}},
		{
			Version: Version,
			Kind:    Run,
			ID:      request.ID,
			Error: &WireError{
				Code:          contract.Internal,
				PublicMessage: "python runtime failed",
				Detail:        strings.Repeat("x", contract.MaxDetailBytes+1),
			},
		},
		{Version: Version, Kind: Run, ID: request.ID, ResultJSON: "[]"},
		{Version: Version, Kind: Run, ID: request.ID, ResultJSON: strings.Repeat("x", contract.MaxResultBytes+1)},
	} {
		var encoded bytes.Buffer
		body, _ := jsonMarshal(response)
		encoded.Write(frameBytes(body))
		if _, err := codec.ReadResponse(&encoded, request); err == nil {
			t.Fatalf("accepted response %#v", response)
		}
	}
	for _, input := range []io.Reader{bytes.NewReader([]byte{0, 0, 0, 0}), bytes.NewReader([]byte{0, 0, 0, 1, '{'}), frame([]byte(`{`))} {
		if _, err := codec.ReadRequest(input); err == nil {
			t.Fatal("accepted malformed frame")
		}
	}
	oversized := make([]byte, MaxFrameSize+1)
	binary.BigEndian.PutUint32(oversized[:4], uint32(MaxFrameSize+1))
	if _, err := codec.ReadRequest(bytes.NewReader(oversized[:4])); err == nil {
		t.Fatal("accepted oversized frame")
	}
}

type shortWriter struct{ writes int }

func (w *shortWriter) Write(p []byte) (int, error) {
	w.writes++
	if w.writes == 1 {
		return 1, nil
	}
	return 0, nil
}

func TestCodecHandlesShortWritesAndPrivateRemoteDetail(t *testing.T) {
	codec := NewCodec(MaxFrameSize)
	request := Request{Version: Version, Kind: Health, ID: "x"}
	if err := codec.WriteRequest(&shortWriter{}, request); err != io.ErrShortWrite {
		t.Fatalf("short write: %v", err)
	}
	err := Error(Response{Error: &WireError{
		Code:          contract.Internal,
		PublicMessage: "python runtime failed",
		Detail:        "secret path /tmp/private",
	}})
	if strings.Contains(contract.PublicMessage(err), "secret") {
		t.Fatal("remote detail leaked")
	}
}

func frame(body []byte) io.Reader { return bytes.NewReader(frameBytes(body)) }

func frameBytes(body []byte) []byte {
	var header [4]byte
	binary.BigEndian.PutUint32(header[:], uint32(len(body)))
	return append(header[:], body...)
}

func jsonMarshal(value any) ([]byte, error) {
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	err := encoder.Encode(value)
	return bytes.TrimSpace(buffer.Bytes()), err
}
