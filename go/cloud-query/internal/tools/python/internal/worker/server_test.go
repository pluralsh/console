package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/protocol"
)

type fakeRuntime struct {
	health error
	output *contract.RunOutput
	run    error
	calls  int
}

func (f *fakeRuntime) Health() error { return f.health }

func (f *fakeRuntime) Run(_ context.Context, _, _ string) (*contract.RunOutput, error) {
	f.calls++
	return f.output, f.run
}

func TestServerDispatchesAndKeepsErrorDetailPrivate(t *testing.T) {
	codec := protocol.NewCodec(protocol.MaxFrameSize)
	runtime := &fakeRuntime{output: &contract.RunOutput{ResultJSON: "{}"}}
	var in, out bytes.Buffer
	request := protocol.Request{Version: protocol.Version, Kind: protocol.Run, ID: "1", Script: "output={}", InputJSON: "{}"}
	if err := codec.WriteRequest(&in, request); err != nil {
		t.Fatal(err)
	}
	if err := newServer(runtime).Run(&in, &out); err != nil {
		t.Fatal(err)
	}
	response, err := codec.ReadResponse(&out, request)
	if err != nil || response.ResultJSON != "{}" || runtime.calls != 1 {
		t.Fatalf("response=%#v err=%v", response, err)
	}
	runtime.run = contract.Failed("python execution failed", errors.New("private host detail"))
	in.Reset()
	out.Reset()
	_ = codec.WriteRequest(&in, request)
	if err := newServer(runtime).Run(&in, &out); err != nil {
		t.Fatal(err)
	}
	response, err = codec.ReadResponse(&out, request)
	if err != nil || response.Error == nil || contract.PublicMessage(protocol.Error(response)) != "python execution failed" {
		t.Fatalf("error response=%#v err=%v", response, err)
	}
}

func TestMontyRuntimeFreshStateAndStdout(t *testing.T) {
	runtime := newMontyRuntime()
	first, err := runtime.Run(context.Background(), "secret = 42\noutput = {'sum': input['value'] + 1}\nprint('ok')", `{"value":1}`)
	if err != nil || first.ResultJSON != "{\"sum\": 2}" || first.Stdout != "ok\n" {
		t.Fatalf("first=%#v err=%v", first, err)
	}
	if _, err := runtime.Run(context.Background(), "output = {'secret': secret}", "{}"); contract.CodeOf(err) != contract.FailedPrecondition {
		t.Fatalf("state leaked: %v", err)
	}
}

func TestMontyRuntimeUsesUTCClockOnly(t *testing.T) {
	runtime := &montyRuntime{
		now: func() time.Time {
			return time.Date(2026, time.April, 5, 6, 7, 8, 123456000, time.FixedZone("CEST", 2*60*60))
		},
	}

	output, err := runtime.Run(context.Background(), `
from datetime import date, datetime
now = datetime.now()
today = date.today()
output = {"now": now.isoformat(), "today": today.isoformat()}
`, "{}")
	if err != nil {
		t.Fatal(err)
	}

	var result map[string]string
	if err := json.Unmarshal([]byte(output.ResultJSON), &result); err != nil {
		t.Fatal(err)
	}
	if want := map[string]string{
		"now":   "2026-04-05T04:07:08.123456",
		"today": "2026-04-05",
	}; !equalStringMaps(result, want) {
		t.Fatalf("result = %#v, want %#v", result, want)
	}

	for name, script := range map[string]string{
		"environment": "import os\noutput = {'value': os.getenv('SECRET')}",
		"filesystem":  "from pathlib import Path\noutput = {'value': Path('/tmp/test').exists()}",
		"non-UTC clock": `
from datetime import datetime, timedelta, timezone
output = {"value": datetime.now(timezone(timedelta(hours=1))).isoformat()}
`,
	} {
		t.Run(name, func(t *testing.T) {
			_, err := runtime.Run(context.Background(), script, "{}")
			if contract.CodeOf(err) != contract.FailedPrecondition {
				t.Fatalf("err = %v", err)
			}

			message := contract.PublicMessage(err)
			if name == "non-UTC clock" && !strings.Contains(message, "only supports UTC") {
				t.Fatalf("err = %v", err)
			}
			if name != "non-UTC clock" && !strings.Contains(message, "NotImplementedError") {
				t.Fatalf("err = %v", err)
			}
		})
	}
}

func equalStringMaps(got, want map[string]string) bool {
	if len(got) != len(want) {
		return false
	}

	for key, wantValue := range want {
		if got[key] != wantValue {
			return false
		}
	}

	return true
}
