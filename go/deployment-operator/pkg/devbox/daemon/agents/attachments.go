package agents

import (
	"encoding/base64"
	"fmt"
	"mime"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"google.golang.org/grpc/codes"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// AttachmentsDir holds prompt attachments, relative to the home directory: <dir>/<prompt id>/<name>.
const AttachmentsDir = ".plural/attachments"

const (
	// MaxAttachments and MaxAttachmentBytes bound one prompt; console enforces the same limits before sending.
	MaxAttachments     = 10
	MaxAttachmentBytes = 24 << 20
	// maxInlineImage is the largest image sent inline to agents that accept images (the usual vendor limit).
	maxInlineImage = 5 << 20
	maxNameLen     = 200
)

var (
	inlineImageTypes = []string{"image/png", "image/jpeg", "image/gif", "image/webp"}
	promptIDPattern  = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)
	unsafeNameChars  = regexp.MustCompile(`[\x00-\x1f\x7f/\\]`)
	// preferredExt names inline blocks; mime.ExtensionsByType sorts alphabetically (.jfif before .jpg).
	preferredExt = map[string]string{
		"image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp",
		"audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mpeg": ".mp3", "audio/ogg": ".ogg", "audio/webm": ".webm",
	}
)

// attachmentFile is a file to write for a prompt: an attachment, or an inline image/audio block moved to disk.
type attachmentFile struct {
	name     string
	mimeType string
	data     []byte
}

// stageAttachments writes a prompt's attachments, and any inline image or audio blocks in its content, under
// ~/.plural/attachments/<prompt id>/ and returns the content with a resource_link per file in their place. The
// transcript keeps the links; whether a file also goes inline is decided per agent when the turn is sent.
// Rewriting the same prompt id writes the same files, so a retried prompt is harmless.
func (m *Manager) stageAttachments(req *devboxv1.PromptRequest) ([]*devboxv1.ContentBlock, error) {
	content := make([]*devboxv1.ContentBlock, 0, len(req.GetContent())+len(req.GetAttachments()))
	var files []attachmentFile
	for _, b := range req.GetContent() {
		f, ok, err := inlineFile(b, len(files))
		if err != nil {
			return nil, invalidPrompt(err.Error())
		}
		if !ok {
			content = append(content, b)
			continue
		}
		files = append(files, f)
	}
	for _, a := range req.GetAttachments() {
		files = append(files, attachmentFile{name: a.GetName(), mimeType: a.GetMimeType(), data: a.GetData()})
	}
	if len(files) == 0 {
		return content, nil
	}
	if len(files) > MaxAttachments {
		return nil, invalidPrompt(fmt.Sprintf("a prompt can have at most %d attachments", MaxAttachments))
	}
	total := 0
	for _, f := range files {
		total += len(f.data)
	}
	if total > MaxAttachmentBytes {
		return nil, invalidPrompt(fmt.Sprintf("attachments total %d bytes, more than the %d allowed per prompt", total, MaxAttachmentBytes))
	}
	if !promptIDPattern.MatchString(req.GetPromptId()) {
		return nil, invalidPrompt("prompt_id must be a plain identifier to attach files")
	}

	dir := filepath.Join(m.opts.Home, AttachmentsDir, req.GetPromptId())
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("attachments dir: %w", err)
	}
	used := map[string]bool{}
	for _, f := range files {
		name := uniqueName(safeName(f.name), used)
		path := filepath.Join(dir, name)
		if err := fsutil.WriteFileAtomic(path, f.data, 0o644); err != nil {
			return nil, fmt.Errorf("write attachment %s: %w", name, err)
		}
		size := int64(len(f.data))
		content = append(content, &devboxv1.ContentBlock{Block: &devboxv1.ContentBlock_ResourceLink{ResourceLink: &devboxv1.ResourceLink{
			Uri: fileURI(path), Name: name, MimeType: mimeOf(f.mimeType, name), Size: &size,
		}}})
	}
	return content, nil
}

// inlineFile turns an inline image or audio block into a file to stage.
func inlineFile(b *devboxv1.ContentBlock, n int) (attachmentFile, bool, error) {
	var data, mimeType, kind string
	switch {
	case b.GetImage() != nil && b.GetImage().GetData() != "":
		data, mimeType, kind = b.GetImage().GetData(), b.GetImage().GetMimeType(), "image"
	case b.GetAudio() != nil && b.GetAudio().GetData() != "":
		data, mimeType, kind = b.GetAudio().GetData(), b.GetAudio().GetMimeType(), "audio"
	default:
		return attachmentFile{}, false, nil
	}
	raw, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return attachmentFile{}, false, fmt.Errorf("%s block data is not base64: %w", kind, err)
	}
	name := kind + "-" + strconv.Itoa(n+1)
	if ext, ok := preferredExt[mimeType]; ok {
		name += ext
	} else if exts, _ := mime.ExtensionsByType(mimeType); len(exts) > 0 {
		name += exts[0]
	}
	return attachmentFile{name: name, mimeType: mimeType, data: raw}, true, nil
}

// agentPrompt is the prompt sent to the agent for content as recorded: each staged image an agent accepts also
// goes inline, ahead of its link, so the agent sees it while still knowing where the file is.
func (m *Manager) agentPrompt(c *agentConn, t *thread, content []*devboxv1.ContentBlock) []any {
	content = m.worktreeContent(t, content)
	blocks, _ := acp.ContentBlocksJSON(content)
	if !c.caps.promptImage {
		return blocks
	}
	root := filepath.Join(m.opts.Home, AttachmentsDir) + string(filepath.Separator)
	out := make([]any, 0, len(blocks))
	for i, b := range content {
		if img := m.inlineImage(b.GetResourceLink(), root); img != nil {
			out = append(out, img)
		}
		out = append(out, blocks[i])
	}
	return out
}

func (m *Manager) inlineImage(link *devboxv1.ResourceLink, root string) acp.Object {
	if link == nil || !slices.Contains(inlineImageTypes, link.GetMimeType()) || link.GetSize() > maxInlineImage {
		return nil
	}
	u, err := url.Parse(link.GetUri())
	if err != nil || u.Scheme != fileScheme || !strings.HasPrefix(filepath.Clean(u.Path), root) {
		return nil
	}
	data, err := os.ReadFile(u.Path)
	if err != nil || len(data) > maxInlineImage {
		m.log.Warn("attachment not inlined", "path", u.Path, "err", err)
		return nil
	}
	return acp.Object{"type": "image", "mimeType": link.GetMimeType(), "data": base64.StdEncoding.EncodeToString(data), "uri": link.GetUri()}
}

func safeName(name string) string {
	name = strings.TrimSpace(unsafeNameChars.ReplaceAllString(filepath.Base(strings.ReplaceAll(name, `\`, "/")), "_"))
	if r := []rune(name); len(r) > maxNameLen {
		name = string(r[:maxNameLen])
	}
	if name == "" || name == "." || name == ".." || name == "/" {
		return "file"
	}
	return name
}

// uniqueName suffixes repeated names in one prompt: a.png, a (2).png, ...
func uniqueName(name string, used map[string]bool) string {
	out := name
	ext := filepath.Ext(name)
	for i := 2; used[out]; i++ {
		out = strings.TrimSuffix(name, ext) + " (" + strconv.Itoa(i) + ")" + ext
	}
	used[out] = true
	return out
}

func mimeOf(declared, name string) string {
	if declared != "" && declared != "application/octet-stream" {
		return declared
	}
	if t := mime.TypeByExtension(filepath.Ext(name)); t != "" {
		return strings.TrimSpace(strings.Split(t, ";")[0])
	}
	return "application/octet-stream"
}

const fileScheme = "file"

func fileURI(path string) string { return (&url.URL{Scheme: fileScheme, Path: path}).String() }

func invalidPrompt(msg string) error {
	return derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, msg, nil)
}
