package devboxv1_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"
	"google.golang.org/protobuf/reflect/protoregistry"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func toolCallEntity(t *testing.T) *devboxv1.AcpEntity {
	t.Helper()
	meta, err := structpb.NewStruct(map[string]any{"claudeCode": map[string]any{"toolName": "Edit"}})
	require.NoError(t, err)
	rawInput, err := structpb.NewValue(map[string]any{"file_path": "/home/dev/console/mix.exs"})
	require.NoError(t, err)
	oldText := "old"

	return &devboxv1.AcpEntity{
		Key:       &devboxv1.EntityKey{SessionId: "sess-1", Type: devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL, Id: "call-1"},
		Position:  7,
		Revision:  2,
		CreatedAt: timestamppb.Now(),
		UpdatedAt: timestamppb.Now(),
		Settled:   true,
		AcpJson:   []byte(`{"sessionUpdate":"tool_call_update","toolCallId":"call-1"}`),
		Body: &devboxv1.AcpEntity_ToolCall{ToolCall: &devboxv1.ToolCall{
			ToolCallId: "call-1",
			Title:      "Edit mix.exs",
			Kind:       "edit",
			Status:     "completed",
			RawInput:   rawInput,
			Meta:       meta,
			Locations:  []*devboxv1.ToolCallLocation{{Path: "/home/dev/console/mix.exs", Line: proto.Int64(12)}},
			Content: []*devboxv1.ToolCallContent{
				{Content: &devboxv1.ToolCallContent_Diff{Diff: &devboxv1.Diff{Path: "mix.exs", OldText: &oldText, NewText: "new"}}},
				{Content: &devboxv1.ToolCallContent_Terminal{Terminal: &devboxv1.TerminalRef{TerminalId: "term-1"}}},
				{Content: &devboxv1.ToolCallContent_Block{Block: &devboxv1.ContentBlock{
					Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: &devboxv1.ResourceLink{Uri: "file:///x", Name: "x", Size: proto.Int64(3)}},
				}}},
				{Content: &devboxv1.ToolCallContent_Unknown{Unknown: &devboxv1.UnknownVariant{Type: "chart", RawJson: []byte(`{"type":"chart"}`)}}},
			},
		}},
	}
}

func TestBinaryRoundTrip(t *testing.T) {
	messages := []proto.Message{
		toolCallEntity(t),
		&devboxv1.PromptRequest{
			Thread:   &devboxv1.ThreadRef{InstanceId: "inst-1", ThreadId: "thread-1"},
			PromptId: "prompt-1",
			Content: []*devboxv1.ContentBlock{
				{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{Text: "/review the billing service"}}},
				{Block: &devboxv1.ContentBlock_Image{Image: &devboxv1.ImageContent{Data: "aGVsbG8=", MimeType: "image/png"}}},
				{Block: &devboxv1.ContentBlock_Audio{Audio: &devboxv1.AudioContent{Data: "aGVsbG8=", MimeType: "audio/wav"}}},
				{Block: &devboxv1.ContentBlock_Resource{Resource: &devboxv1.EmbeddedResource{
					Resource: &devboxv1.EmbeddedResource_Text{Text: &devboxv1.TextResourceContents{Uri: "file:///a", Text: "a"}},
				}}},
			},
			ResumeIfSuspended: true,
		},
		&devboxv1.UpsertInstanceIndexRequest{
			InstanceId: "inst-1",
			Sessions: []*devboxv1.Session{{
				ThreadId:   "thread-1",
				SessionId:  "sess-1",
				Kind:       devboxv1.SessionKind_SESSION_KIND_THREAD,
				Agent:      devboxv1.AgentType_AGENT_TYPE_CLAUDE,
				Status:     devboxv1.ThreadStatus_THREAD_STATUS_ACTIVE,
				Foreground: &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION},
				ConfigOptions: []*devboxv1.ConfigOption{{
					Id: "model", Category: "model", Type: "select", CurrentValue: "opus",
					Options: []*devboxv1.ConfigOptionValue{{Value: "opus"}, {Value: "sonnet"}},
				}},
				Revision: 4,
			}},
			Interactions: []*devboxv1.Interaction{{
				InteractionId: "int-1",
				SessionId:     "sess-1",
				Kind:          devboxv1.InteractionKind_INTERACTION_KIND_PERMISSION,
				State:         devboxv1.InteractionState_INTERACTION_STATE_ANSWERED,
				Request: &devboxv1.Interaction_Permission{Permission: &devboxv1.PermissionRequest{
					Options: []*devboxv1.PermissionOption{{OptionId: "allow", Kind: "allow_once"}},
				}},
				Response: &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
					Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: "allow"}},
				}},
				Revision: 2,
			}},
		},
		&devboxv1.GetInstanceCredentialsResponse{Credentials: []*devboxv1.InstanceCredential{{
			Kind:               devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX,
			CodexMode:          devboxv1.CodexCredentialMode_CODEX_CREDENTIAL_MODE_CHATGPT_AUTH,
			Version:            3,
			BundleJson:         []byte(`{"auth_mode":"chatgpt"}`),
			RefreshLeaseHolder: true,
		}}},
	}

	for _, msg := range messages {
		t.Run(string(msg.ProtoReflect().Descriptor().FullName()), func(t *testing.T) {
			data, err := proto.Marshal(msg)
			require.NoError(t, err)

			decoded := msg.ProtoReflect().New().Interface()
			require.NoError(t, proto.Unmarshal(data, decoded))
			assert.True(t, proto.Equal(msg, decoded), "binary round trip changed %s", msg.ProtoReflect().Descriptor().FullName())
		})
	}
}

func TestJSONRoundTrip(t *testing.T) {
	event := &devboxv1.DaemonEvent{
		Offset:    42,
		EmittedAt: timestamppb.Now(),
		Event: &devboxv1.DaemonEvent_Delta{Delta: &devboxv1.Delta{
			InstanceId: "inst-1",
			SessionId:  "sess-1",
			EntityType: devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL,
			EntityId:   "call-1",
			Op:         devboxv1.DeltaOp_DELTA_OP_SETTLE,
			Entity:     toolCallEntity(t),
			Offset:     42,
		}},
	}

	data, err := protojson.Marshal(event)
	require.NoError(t, err)

	decoded := &devboxv1.DaemonEvent{}
	require.NoError(t, protojson.Unmarshal(data, decoded))
	assert.True(t, proto.Equal(event, decoded))
}

func TestServiceDescriptors(t *testing.T) {
	services := map[string]int{
		"devbox.v1.Control":            0,
		"devbox.v1.Gateway":            0,
		"devbox.v1.Tunnel":             0,
		"devbox.v1.Ingest":             0,
		"devbox.v1.Daemon":             0,
		"devbox.v1.SandboxCredentials": 0,
	}
	for name := range services {
		desc, err := protoregistry.GlobalFiles.FindDescriptorByName(protoreflect.FullName(name))
		require.NoError(t, err, name)
		svc, ok := desc.(protoreflect.ServiceDescriptor)
		require.True(t, ok, name)
		assert.NotZero(t, svc.Methods().Len(), name)
	}

	assert.Equal(t, "devbox.v1.Control", devboxv1.Control_ServiceDesc.ServiceName)
	assert.Equal(t, "devbox.v1.Gateway", devboxv1.Gateway_ServiceDesc.ServiceName)
	assert.Equal(t, "devbox.v1.Ingest", devboxv1.Ingest_ServiceDesc.ServiceName)
	assert.Equal(t, "devbox.v1.Daemon", devboxv1.Daemon_ServiceDesc.ServiceName)
	assert.Equal(t, "devbox.v1.Tunnel", devboxv1.Tunnel_ServiceDesc.ServiceName)
	assert.Equal(t, "devbox.v1.SandboxCredentials", devboxv1.SandboxCredentials_ServiceDesc.ServiceName)
}

// KAS forwards Control calls to the Gateway as raw frames, so every Control method must exist on the Gateway
// with identical request and response types and streaming shape.
func TestGatewayMirrorsControl(t *testing.T) {
	control := devboxv1.File_devbox_v1_control_proto.Services().ByName("Control")
	gateway := devboxv1.File_devbox_v1_gateway_proto.Services().ByName("Gateway")
	require.NotNil(t, control)
	require.NotNil(t, gateway)

	for i := 0; i < control.Methods().Len(); i++ {
		cm := control.Methods().Get(i)
		gm := gateway.Methods().ByName(cm.Name())
		if !assert.NotNil(t, gm, "Gateway is missing %s", cm.Name()) {
			continue
		}
		assert.Equal(t, cm.Input().FullName(), gm.Input().FullName(), cm.Name())
		assert.Equal(t, cm.Output().FullName(), gm.Output().FullName(), cm.Name())
		assert.Equal(t, cm.IsStreamingClient(), gm.IsStreamingClient(), cm.Name())
		assert.Equal(t, cm.IsStreamingServer(), gm.IsStreamingServer(), cm.Name())
	}
}

func TestGatewayMethodForControl(t *testing.T) {
	method, ok := devboxv1.GatewayMethodForControl("/devbox.v1.Control/GetTimeline")
	assert.True(t, ok)
	assert.Equal(t, "/devbox.v1.Gateway/GetTimeline", method)

	for _, unknown := range []string{
		"/devbox.v1.Control/NoSuchMethod",
		"/devbox.v1.Ingest/Heartbeat",
		"/devbox.v1.Gateway/GetTimeline",
		"/devbox.v1.Control/",
	} {
		_, ok := devboxv1.GatewayMethodForControl(unknown)
		assert.False(t, ok, unknown)
	}
}
