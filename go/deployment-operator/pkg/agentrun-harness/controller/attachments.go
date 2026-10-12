package controller

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"k8s.io/klog/v2"

	gqlclient "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/attachments"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

var attachmentsHTTPClient = &http.Client{Timeout: 5 * time.Minute}

// prepareAttachmentsDir creates the attachments directory up front so agents
// configured with restricted read roots can see files downloaded by later prompts.
func prepareAttachmentsDir() {
	if err := os.MkdirAll(attachments.Dir(), 0o755); err != nil {
		klog.ErrorS(err, "could not create attachments directory", "dir", attachments.Dir())
	}
}

// withAttachments downloads files into a subdirectory of the attachments
// directory and appends a hint describing them to prompt.
func (in *agentRunController) withAttachments(ctx context.Context, subdir, prompt string, files []*gqlclient.AgentAttachmentFragment) string {
	if len(files) == 0 {
		return prompt
	}

	downloaded := attachments.Download(ctx, attachmentsHTTPClient, filepath.Join(attachments.Dir(), subdir), files)
	for _, file := range downloaded {
		if file.Err != nil {
			klog.ErrorS(file.Err, "could not download attachment", "id", in.agentRunID, "filename", file.Filename)
			continue
		}
		klog.V(log.LogLevelInfo).InfoS("downloaded attachment", "id", in.agentRunID, "path", file.Path)
	}
	return attachments.AppendHint(prompt, downloaded)
}

func promptAttachmentsDir(seq int64) string {
	return fmt.Sprintf("prompt-%d", seq)
}
