// Package attachments downloads files attached to an agent run or its prompts
// and describes them to the coding agent.
package attachments

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

// EnvDir overrides the canonical attachments directory. Used in tests.
const EnvDir = "PLRL_AGENT_RUN_ATTACHMENTS_DIR"

// File is an attachment and where it was downloaded to.
type File struct {
	Filename string
	Filetype string
	Size     int64
	// Path is the local path of the downloaded file, empty when Err is set.
	Path string
	Err  error
}

// Dir returns the attachments directory, honoring PLRL_AGENT_RUN_ATTACHMENTS_DIR.
func Dir() string {
	if dir := strings.TrimSpace(os.Getenv(EnvDir)); dir != "" {
		return dir
	}
	return common.AgentRunAttachmentsDir
}

// ReadDirs returns the attachments directory when it exists so agents with
// restricted filesystem access can read downloaded files.
func ReadDirs() []string {
	dir := Dir()
	info, err := os.Stat(dir)
	if err != nil || !info.IsDir() {
		return nil
	}
	return []string{dir}
}

// Download fetches each attachment into dir. Failures are recorded on the
// returned files rather than aborting, so the agent can still be told about them.
func Download(ctx context.Context, client *http.Client, dir string, attachments []*console.AgentAttachmentFragment) []File {
	files := make([]File, 0, len(attachments))
	used := make(map[string]struct{}, len(attachments))
	for _, attachment := range attachments {
		if attachment == nil {
			continue
		}

		file := File{Filename: attachment.Filename}
		if attachment.Filetype != nil {
			file.Filetype = *attachment.Filetype
		}
		if attachment.Size != nil {
			file.Size = *attachment.Size
		}

		path := filepath.Join(dir, uniqueName(attachment.Filename, used))
		switch {
		case attachment.DownloadURL == nil || *attachment.DownloadURL == "":
			file.Err = fmt.Errorf("no download url available")
		default:
			if err := download(ctx, client, *attachment.DownloadURL, path); err != nil {
				file.Err = err
			} else {
				file.Path = path
			}
		}
		files = append(files, file)
	}
	return files
}

// AppendHint appends a section listing the downloaded files to prompt.
func AppendHint(prompt string, files []File) string {
	if len(files) == 0 {
		return prompt
	}

	var sb strings.Builder
	sb.WriteString(strings.TrimRight(prompt, "\n"))
	sb.WriteString("\n\n## Attached files\n\n")
	sb.WriteString("The following files were attached to help with this task and downloaded locally. ")
	sb.WriteString("They live outside the repository, so read them in place and don't commit them; ")
	sb.WriteString("copy one into the repository only if the task requires it.\n\n")
	for _, file := range files {
		if file.Err != nil {
			fmt.Fprintf(&sb, "- %s could not be downloaded: %s\n", file.Filename, file.Err)
			continue
		}
		fmt.Fprintf(&sb, "- `%s`%s\n", file.Path, describe(file))
	}
	return sb.String()
}

func describe(file File) string {
	parts := make([]string, 0, 2)
	if file.Filetype != "" {
		parts = append(parts, file.Filetype)
	}
	if file.Size > 0 {
		parts = append(parts, humanSize(file.Size))
	}
	if len(parts) == 0 {
		return ""
	}
	return " (" + strings.Join(parts, ", ") + ")"
}

func humanSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

func uniqueName(filename string, used map[string]struct{}) string {
	name := filepath.Base(strings.ReplaceAll(filename, "\\", "/"))
	if name == "" || name == "." || name == ".." || name == "/" {
		name = "attachment"
	}

	candidate := name
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	for i := 2; ; i++ {
		if _, ok := used[candidate]; !ok {
			break
		}
		candidate = fmt.Sprintf("%s-%d%s", stem, i, ext)
	}
	used[candidate] = struct{}{}
	return candidate
}

func download(ctx context.Context, client *http.Client, url, path string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create directory: %w", err)
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".download-*")
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer os.Remove(tmp.Name())

	if _, err := io.Copy(tmp, resp.Body); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("write file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("write file: %w", err)
	}
	if err := os.Chmod(tmp.Name(), 0o644); err != nil {
		return fmt.Errorf("chmod file: %w", err)
	}
	return os.Rename(tmp.Name(), path)
}
