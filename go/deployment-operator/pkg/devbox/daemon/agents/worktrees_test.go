package agents

import (
	"context"
	"encoding/json"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
)

func TestThreadsGetTheirOwnWorktrees(t *testing.T) {
	var (
		mu      sync.Mutex
		home    string
		created = map[string][]string{}
	)
	h := newManagerWith(t, 4, devboxv1.BillingMode_BILLING_MODE_PROXY, func(o *Options) {
		home = o.Home
		o.Checkouts = func() []*devboxv1.Checkout {
			return []*devboxv1.Checkout{
				{Name: "api", Path: filepath.Join(home, "api")},
				{Name: "console", Path: filepath.Join(home, "console")},
				{Name: "console", Path: filepath.Join(home, ".threads", "old", "console"), WorktreeThreadId: "old"},
			}
		}
		o.Worktrees = func(id string, repos []string) (string, error) {
			mu.Lock()
			created[id] = repos
			mu.Unlock()
			return filepath.Join(home, ".threads", id), nil
		}
	})

	s := h.create(t, "t1")
	mu.Lock()
	got := created["t1"]
	mu.Unlock()
	if !slices.Equal(got, []string{"api", "console"}) {
		t.Fatalf("t1 got worktrees of %v, want every main checkout", got)
	}
	if !slices.Equal(s.GetWorktreeRepos(), []string{"api", "console"}) || s.GetCwd() != filepath.Join(home, ".threads", "t1") {
		t.Fatalf("t1 runs in %q with worktrees %v", s.GetCwd(), s.GetWorktreeRepos())
	}

	pinned, err := h.m.CreateThread(context.Background(), &devboxv1.CreateThreadRequest{InstanceId: instance, ThreadId: "t2", Agent: claude, Cwd: "~/console"})
	if err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	_, made := created["t2"]
	mu.Unlock()
	if made || pinned.GetCwd() != filepath.Join(home, "console") || len(pinned.GetWorktreeRepos()) != 0 {
		t.Fatalf("a thread given a directory got worktrees: cwd %q, worktrees %v", pinned.GetCwd(), pinned.GetWorktreeRepos())
	}

	mention := `look at <plrl-devbox-file path="` + filepath.Join(home, "console", "lib") + `/"></plrl-devbox-file> and ` +
		`<plrl-devbox-file path="` + filepath.Join(home, "notes.md") + `"></plrl-devbox-file>`
	link := "file://" + filepath.Join(home, "api", "main.go")
	_, err = h.m.Prompt(context.Background(), &devboxv1.PromptRequest{
		Thread: &devboxv1.ThreadRef{InstanceId: instance, ThreadId: "t1", SessionId: s.GetSessionId()}, PromptId: "p1",
		Content: []*devboxv1.ContentBlock{
			{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{Text: mention}}},
			{Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: &devboxv1.ResourceLink{Uri: link, Name: "main.go"}}},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	eventually(t, "the prompt", func() bool { return len(h.calls(t, acp.MethodSessionPrompt)) == 1 })
	sent, _ := json.Marshal(h.calls(t, acp.MethodSessionPrompt)[0]["prompt"])
	for _, want := range []string{
		filepath.Join(home, ".threads", "t1", "console", "lib") + `/`,
		"file://" + filepath.Join(home, ".threads", "t1", "api", "main.go"),
		filepath.Join(home, "notes.md"),
	} {
		if !strings.Contains(string(sent), want) {
			t.Fatalf("prompt sent to the agent lacks %s: %s", want, sent)
		}
	}
	if strings.Contains(string(sent), filepath.Join(home, "console", "lib")) {
		t.Fatalf("prompt still points at the main checkout: %s", sent)
	}

	eventually(t, "idle", func() bool { return h.idle("t1") })
	msg := h.entities(s.GetSessionId())["ENTITY_TYPE_USER_MESSAGE/prompt-p1"]
	if msg == nil || msg.GetMessage().GetContent()[0].GetText().GetText() != mention {
		t.Fatalf("the stored message isn't what the user wrote: %v", msg)
	}
}
