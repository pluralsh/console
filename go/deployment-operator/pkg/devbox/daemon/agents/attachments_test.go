package agents

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
)

var png = []byte("\x89PNG\r\n\x1a\nfake")

func TestPromptAttachments(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	ref := &devboxv1.ThreadRef{InstanceId: instance, ThreadId: s.GetThreadId(), SessionId: s.GetSessionId()}
	content := append(text("look at these"), &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_Image{Image: &devboxv1.ImageContent{
		Data: base64.StdEncoding.EncodeToString(png), MimeType: "image/png",
	}}})
	_, err := h.m.Prompt(context.Background(), &devboxv1.PromptRequest{Thread: ref, PromptId: "p1", Content: content, Attachments: []*devboxv1.PromptAttachment{
		{Name: "shot.png", MimeType: "image/png", Data: png},
		{Name: "../../etc/notes.txt", Data: []byte("hi")},
		{Name: "shot.png", MimeType: "image/png", Data: png},
	}})
	if err != nil {
		t.Fatal(err)
	}
	eventually(t, "idle", func() bool { return len(h.calls(t, acp.MethodSessionPrompt)) == 1 && h.idle("t1") })

	dir := filepath.Join(h.m.opts.Home, AttachmentsDir, "p1")
	for _, name := range []string{"image-1.png", "shot.png", "notes.txt", "shot (2).png"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			t.Fatalf("attachment %s not written: %v", name, err)
		}
	}

	// The transcript keeps links only: the inline image block was moved to a file too.
	msg := h.entities(s.GetSessionId())["ENTITY_TYPE_USER_MESSAGE/prompt-p1"].GetMessage().GetContent()
	var links []string
	for _, b := range msg {
		if b.GetImage() != nil {
			t.Fatalf("user message kept an inline image: %v", msg)
		}
		if l := b.GetResourceLink(); l != nil {
			links = append(links, l.GetName())
			if l.GetUri() != fileURI(filepath.Join(dir, l.GetName())) {
				t.Fatalf("link %s points at %s", l.GetName(), l.GetUri())
			}
		}
	}
	if len(links) != 4 || links[2] != "notes.txt" {
		t.Fatalf("links = %v", links)
	}

	// The agent accepts images, so each png also goes inline, ahead of its link; the text file is a link only.
	var kinds []string
	for _, b := range acp.Arr(h.calls(t, acp.MethodSessionPrompt)[0], "prompt") {
		kinds = append(kinds, acp.Str(b.(map[string]any), "type"))
	}
	want := []string{"text", "image", "resource_link", "image", "resource_link", "resource_link", "image", "resource_link"}
	if len(kinds) != len(want) {
		t.Fatalf("agent prompt = %v, want %v", kinds, want)
	}
	for i := range want {
		if kinds[i] != want[i] {
			t.Fatalf("agent prompt = %v, want %v", kinds, want)
		}
	}
}

func TestPromptAttachmentLimits(t *testing.T) {
	h := newManager(t, 4)
	s := h.create(t, "t1")
	ref := &devboxv1.ThreadRef{InstanceId: instance, ThreadId: s.GetThreadId(), SessionId: s.GetSessionId()}
	many := make([]*devboxv1.PromptAttachment, MaxAttachments+1)
	for i := range many {
		many[i] = &devboxv1.PromptAttachment{Name: "f", Data: []byte("x")}
	}
	cases := map[string]*devboxv1.PromptRequest{
		"too many":   {Thread: ref, PromptId: "p1", Attachments: many},
		"too large":  {Thread: ref, PromptId: "p2", Attachments: []*devboxv1.PromptAttachment{{Name: "big", Data: make([]byte, MaxAttachmentBytes+1)}}},
		"unsafe id":  {Thread: ref, PromptId: "../p3", Attachments: []*devboxv1.PromptAttachment{{Name: "f", Data: []byte("x")}}},
		"bad base64": {Thread: ref, PromptId: "p4", Content: []*devboxv1.ContentBlock{{Block: &devboxv1.ContentBlock_Image{Image: &devboxv1.ImageContent{Data: "%%%", MimeType: "image/png"}}}}},
	}
	for name, req := range cases {
		if _, err := h.m.Prompt(context.Background(), req); status.Code(err) != codes.InvalidArgument {
			t.Fatalf("%s: %v, want InvalidArgument", name, err)
		}
	}
	if _, err := os.Stat(filepath.Join(h.m.opts.Home, AttachmentsDir)); !os.IsNotExist(err) {
		t.Fatalf("rejected prompts wrote attachments: %v", err)
	}
}

func TestAgentPromptWithoutImageSupport(t *testing.T) {
	m := &Manager{opts: Options{Home: t.TempDir()}}
	path := filepath.Join(m.opts.Home, AttachmentsDir, "p1", "a.png")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, png, 0o644); err != nil {
		t.Fatal(err)
	}
	size := int64(len(png))
	content := []*devboxv1.ContentBlock{{Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: &devboxv1.ResourceLink{
		Uri: fileURI(path), Name: "a.png", MimeType: "image/png", Size: &size,
	}}}}
	if got := m.agentPrompt(&agentConn{}, nil, content); len(got) != 1 || acp.Str(got[0].(map[string]any), "type") != "resource_link" {
		t.Fatalf("agent without image support got %v", got)
	}
	outside := []*devboxv1.ContentBlock{{Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: &devboxv1.ResourceLink{
		Uri: "file:///etc/passwd", Name: "passwd", MimeType: "image/png", Size: &size,
	}}}}
	if got := m.agentPrompt(&agentConn{caps: caps{promptImage: true}}, nil, outside); len(got) != 1 {
		t.Fatalf("a link outside the attachments dir was inlined: %v", got)
	}
}
