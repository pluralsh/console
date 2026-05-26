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
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
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
		return
	}

	attrs, closeFiles, err := uploadAttributes(artifacts)
	if err != nil {
		klog.ErrorS(err, "failed to prepare agent run upload artifacts", "agentRunID", in.agentRunID)
		return
	}
	defer closeFiles()

	if _, err := in.consoleClient.CreateAgentRunUpload(ctx, in.agentRunID, attrs); err != nil {
		klog.ErrorS(err, "failed to create agent run upload", "agentRunID", in.agentRunID)
	}
}

func uploadAttributes(artifacts *toolv1.UploadArtifacts) (gqlclient.AgentRunUploadAttributes, func(), error) {
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
		upload, file, err := newUpload(artifacts.SessionPath)
		if err != nil {
			closeF()
			return attrs, func() {}, err
		}
		files = append(files, file)
		attrs.Session = upload
	}

	if artifacts.PatchPath != "" {
		upload, file, err := newUpload(artifacts.PatchPath)
		if err != nil {
			closeF()
			return attrs, func() {}, err
		}
		files = append(files, file)
		attrs.Patch = upload
	}

	return attrs, closeF, nil
}

func newUpload(path string) (*graphql.Upload, *os.File, error) {
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
		ContentType: contentType(path),
	}, file, nil
}

func contentType(path string) string {
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
