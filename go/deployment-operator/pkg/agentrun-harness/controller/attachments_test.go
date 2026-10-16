package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/attachments"
)

func TestWithAttachmentsDownloadsPromptFiles(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(attachments.EnvDir, dir)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("a,b\n1,2\n"))
	}))
	defer server.Close()

	in := &agentRunController{agentRunID: "r1"}
	prompt := in.withAttachments(context.Background(), promptAttachmentsDir(3), "use the data", []*gqlclient.AgentAttachmentFragment{
		{ID: "a1", Filename: "data.csv", Filetype: new("text/csv"), DownloadURL: new(server.URL)},
	})

	path := filepath.Join(dir, "prompt-3", "data.csv")
	contents, err := os.ReadFile(path)
	require.NoError(t, err)
	require.Equal(t, "a,b\n1,2\n", string(contents))
	require.Contains(t, prompt, "use the data\n\n## Attached files")
	require.Contains(t, prompt, "- `"+path+"` (text/csv")
}

func TestWithAttachmentsLeavesPromptsWithoutFilesAlone(t *testing.T) {
	in := &agentRunController{agentRunID: "r1"}
	require.Equal(t, "just a prompt", in.withAttachments(context.Background(), "run", "just a prompt", nil))
}
