package controller

import (
	"context"
	"fmt"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/99designs/gqlgen/graphql"
	"k8s.io/klog/v2"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func (in *agentRunController) uploadAgentRunArtifacts(ctx context.Context) {
	if in.tool == nil {
		return
	}

	artifacts, err := in.tool.UploadArtifacts(ctx)
	if err != nil {
		klog.ErrorS(err, "failed to collect agent run upload artifacts", "agentRunID", in.agentRunID)
	}
	if artifacts == nil || (artifacts.SessionPath == "" && artifacts.PatchPath == "") {
		klog.V(log.LogLevelInfo).InfoS("no agent run upload artifacts collected", "agentRunID", in.agentRunID)
		return
	}
	klog.V(log.LogLevelInfo).InfoS(
		"agent run upload artifacts collected",
		"agentRunID", in.agentRunID,
		"sessionPath", artifacts.SessionPath,
		"patchPath", artifacts.PatchPath,
	)

	attrs, closeFiles, err := in.uploadAttributes(artifacts)
	if err != nil {
		klog.ErrorS(err, "failed to prepare agent run upload artifacts", "agentRunID", in.agentRunID)
		return
	}
	defer closeFiles()

	in.logUploadAttributes(attrs)
	if _, err := in.consoleClient.CreateAgentRunUpload(ctx, in.agentRunID, attrs); err != nil {
		klog.ErrorS(err, "failed to upload agent run artifacts", "agentRunID", in.agentRunID)
		return
	}

	klog.V(log.LogLevelInfo).InfoS("agent run artifacts uploaded", "agentRunID", in.agentRunID)
}

func (in *agentRunController) uploadAttributes(artifacts *artifacts.UploadArtifacts) (gqlclient.AgentRunUploadAttributes, func(), error) {
	var (
		attrs  gqlclient.AgentRunUploadAttributes
		files  []*os.File
		closeF = func() {
			for _, file := range files {
				if err := file.Close(); err != nil {
					klog.ErrorS(err, "failed to close upload artifact", "path", file.Name())
				}
			}
		}
	)

	if artifacts.SessionPath != "" {
		upload, file, err := in.newUpload(artifacts.SessionPath)
		if err != nil {
			closeF()
			return attrs, func() {}, err
		}
		files = append(files, file)
		attrs.Session = upload
		klog.V(log.LogLevelInfo).InfoS(
			"prepared agent run session upload",
			"agentRunID", in.agentRunID,
			"path", artifacts.SessionPath,
			"filename", upload.Filename,
			"size", upload.Size,
			"contentType", upload.ContentType,
		)
	}

	if artifacts.PatchPath != "" {
		upload, file, err := in.newUpload(artifacts.PatchPath)
		if err != nil {
			closeF()
			return attrs, func() {}, err
		}
		files = append(files, file)
		attrs.Patch = upload
		klog.V(log.LogLevelInfo).InfoS(
			"prepared agent run patch upload",
			"agentRunID", in.agentRunID,
			"path", artifacts.PatchPath,
			"filename", upload.Filename,
			"size", upload.Size,
			"contentType", upload.ContentType,
		)
	}

	return attrs, closeF, nil
}

func (in *agentRunController) newUpload(path string) (*graphql.Upload, *os.File, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, nil, fmt.Errorf("open upload artifact %q: %w", path, err)
	}

	info, err := file.Stat()
	if err != nil {
		_ = file.Close()
		return nil, nil, fmt.Errorf("stat upload artifact %q: %w", path, err)
	}

	return &graphql.Upload{
		File:        file,
		Filename:    filepath.Base(path),
		Size:        info.Size(),
		ContentType: in.contentType(path),
	}, file, nil
}

func (in *agentRunController) logUploadAttributes(attrs gqlclient.AgentRunUploadAttributes) {
	values := []any{
		"agentRunID", in.agentRunID,
		"hasSession", attrs.Session != nil,
		"hasScreenRecording", attrs.ScreenRecording != nil,
		"hasPatch", attrs.Patch != nil,
	}
	if attrs.Session != nil {
		values = append(values,
			"sessionFilename", attrs.Session.Filename,
			"sessionSize", attrs.Session.Size,
			"sessionContentType", attrs.Session.ContentType,
		)
	}
	if attrs.ScreenRecording != nil {
		values = append(values,
			"screenRecordingFilename", attrs.ScreenRecording.Filename,
			"screenRecordingSize", attrs.ScreenRecording.Size,
			"screenRecordingContentType", attrs.ScreenRecording.ContentType,
		)
	}
	if attrs.Patch != nil {
		values = append(values,
			"patchFilename", attrs.Patch.Filename,
			"patchSize", attrs.Patch.Size,
			"patchContentType", attrs.Patch.ContentType,
		)
	}
	klog.V(log.LogLevelInfo).InfoS("creating agent run upload with attributes", values...)
}

func (in *agentRunController) contentType(path string) string {
	if strings.HasSuffix(path, ".tar.gz") {
		return "application/gzip"
	}
	if strings.HasSuffix(path, ".patch") {
		return "text/x-patch"
	}
	if typ := mime.TypeByExtension(filepath.Ext(path)); typ != "" {
		return typ
	}
	return "application/octet-stream"
}
