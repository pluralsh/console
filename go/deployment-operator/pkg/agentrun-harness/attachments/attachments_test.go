package attachments

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
)

func TestDownload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/screenshot":
			_, _ = w.Write([]byte("png-bytes"))
		case "/report":
			_, _ = w.Write([]byte("# report"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	dir := filepath.Join(t.TempDir(), "run")
	files := Download(context.Background(), server.Client(), dir, []*console.AgentAttachmentFragment{
		{ID: "1", Filename: "error.png", Filetype: new("image/png"), Size: new(int64(2048)), DownloadURL: new(server.URL + "/screenshot")},
		{ID: "2", Filename: "../report.md", DownloadURL: new(server.URL + "/report")},
		{ID: "3", Filename: "report.md", DownloadURL: new(server.URL + "/report")},
		{ID: "4", Filename: "gone.txt", DownloadURL: new(server.URL + "/missing")},
		{ID: "5", Filename: "nourl.txt"},
	})

	if len(files) != 5 {
		t.Fatalf("got %d files, want 5", len(files))
	}

	want := map[string]string{
		filepath.Join(dir, "error.png"):   "png-bytes",
		filepath.Join(dir, "report.md"):   "# report",
		filepath.Join(dir, "report-2.md"): "# report",
	}
	for i, file := range files[:3] {
		if file.Err != nil {
			t.Fatalf("file %d: unexpected error %v", i, file.Err)
		}
		contents, ok := want[file.Path]
		if !ok {
			t.Fatalf("file %d: unexpected path %q", i, file.Path)
		}
		got, err := os.ReadFile(file.Path)
		if err != nil || string(got) != contents {
			t.Fatalf("file %d: contents = %q, %v, want %q", i, got, err, contents)
		}
	}

	if files[3].Err == nil || !strings.Contains(files[3].Err.Error(), "404") {
		t.Fatalf("expected a 404 error, got %v", files[3].Err)
	}
	if files[4].Err == nil {
		t.Fatalf("expected an error for a missing download url")
	}
	if _, err := os.Stat(filepath.Join(dir, "gone.txt")); !os.IsNotExist(err) {
		t.Fatalf("failed downloads should not leave files behind, stat err = %v", err)
	}
}

func TestAppendHint(t *testing.T) {
	if got := AppendHint("fix it", nil); got != "fix it" {
		t.Fatalf("AppendHint without files = %q", got)
	}

	got := AppendHint("fix it\n", []File{
		{Filename: "error.png", Filetype: "image/png", Size: 2048, Path: "/plural/shared/attachments/run/error.png"},
		{Filename: "notes.txt", Path: "/plural/shared/attachments/run/notes.txt"},
		{Filename: "gone.txt", Err: os.ErrNotExist},
	})

	for _, want := range []string{
		"fix it\n\n## Attached files\n\n",
		"don't commit them",
		"- `/plural/shared/attachments/run/error.png` (image/png, 2.0 KB)\n",
		"- `/plural/shared/attachments/run/notes.txt`\n",
		"- gone.txt could not be downloaded: file does not exist\n",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("AppendHint() = %q, missing %q", got, want)
		}
	}
}

func TestReadDirs(t *testing.T) {
	t.Setenv(EnvDir, filepath.Join(t.TempDir(), "missing"))
	if got := ReadDirs(); got != nil {
		t.Fatalf("ReadDirs() = %v, want nil for a missing dir", got)
	}

	dir := t.TempDir()
	t.Setenv(EnvDir, dir)
	if got := ReadDirs(); len(got) != 1 || got[0] != dir {
		t.Fatalf("ReadDirs() = %v, want [%q]", got, dir)
	}
}
