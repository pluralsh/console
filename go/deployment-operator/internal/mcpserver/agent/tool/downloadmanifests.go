package tool

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/console/godeployment-operator/pkg/agentrun-harness/environment"
	console "github.com/pluralsh/console/godeployment-operator/pkg/client"
)

// Per-service trees land at "<base>/<manifestsSubdir>/<handle>-<service>/".
const manifestsSubdir = "manifests"

// agentHarnessSharedDir is the writable emptyDir mount the operator
// provisions on every agent-run pod's default container. Must stay in
// sync with `sharedContextVolumePath` in internal/controller/agentrun_pod.go.
const agentHarnessSharedDir = "/plural/shared"

var safeNamePattern = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func (in *DownloadManifests) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
			mcp.WithString("cluster",
				mcp.Required(),
				mcp.Description("Handle of the Plural cluster the service is deployed to (e.g. 'mgmt' or 'prod-eu-1')"),
			),
			mcp.WithString("service",
				mcp.Required(),
				mcp.Description("Name of the Plural service whose rendered manifests should be downloaded"),
			),
		),
		in.handler,
	)
}

func (in *DownloadManifests) handler(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	clusterHandle, serviceName, err := parseDownloadManifestsRequest(request)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("could not handle download manifests request: %v", err)), nil
	}

	svc, err := in.client.GetServiceDeploymentByHandle(clusterHandle, serviceName)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to look up service %q on cluster %q: %v", serviceName, clusterHandle, err)), nil
	}

	files, err := in.client.GetServiceTarball(svc.ID)
	if err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to fetch service tarball for %q on cluster %q: %v", serviceName, clusterHandle, err)), nil
	}
	if len(files) == 0 {
		return mcp.NewToolResultError(fmt.Sprintf("service %q on cluster %q does not yet have a rendered tarball available", serviceName, clusterHandle)), nil
	}

	baseDir := resolveManifestsBaseDir()
	targetDir := filepath.Join(baseDir, manifestsSubdir, sanitizeSegment(clusterHandle)+"-"+sanitizeSegment(serviceName))

	if err := os.RemoveAll(targetDir); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to clear target directory %q: %v", targetDir, err)), nil
	}
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return mcp.NewToolResultError(fmt.Sprintf("failed to create target directory %q: %v", targetDir, err)), nil
	}

	written := 0
	for _, file := range files {
		if file == nil {
			continue
		}

		path, err := safeJoin(targetDir, file.Path)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("refusing to write %q from service %q: %v", file.Path, serviceName, err)), nil
		}

		content, err := base64.StdEncoding.DecodeString(file.Content)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to decode content for %q: %v", file.Path, err)), nil
		}

		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to create parent directory for %q: %v", path, err)), nil
		}
		if err := os.WriteFile(path, content, 0o644); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to write %q: %v", path, err)), nil
		}
		written++
	}

	return mcp.NewToolResultJSON(struct {
		Success      bool   `json:"success"`
		Message      string `json:"message"`
		Cluster      string `json:"cluster"`
		Service      string `json:"service"`
		ServiceID    string `json:"serviceId"`
		Directory    string `json:"directory"`
		FileCount    int    `json:"fileCount"`
		Instructions string `json:"instructions"`
	}{
		Success:   true,
		Message:   fmt.Sprintf("downloaded manifests for service %q on cluster %q", serviceName, clusterHandle),
		Cluster:   clusterHandle,
		Service:   serviceName,
		ServiceID: svc.ID,
		Directory: targetDir,
		FileCount: written,
		Instructions: fmt.Sprintf(
			"The rendered Kubernetes manifests for the service have been written to %q. "+
				"Use Read/Glob/Grep against this directory to inspect the actual resources Plural is applying "+
				"(including resources rendered from external Helm charts) instead of guessing via web searches.",
			targetDir,
		),
	})
}

// parseDownloadManifestsRequest returns the request args as locals so
// concurrent MCP invocations can't clobber shared state on the *DownloadManifests
// receiver.
func parseDownloadManifestsRequest(request mcp.CallToolRequest) (cluster, service string, err error) {
	if cluster, err = request.RequireString("cluster"); err != nil {
		return "", "", err
	}
	if service, err = request.RequireString("service"); err != nil {
		return "", "", err
	}

	cluster = strings.TrimSpace(cluster)
	service = strings.TrimSpace(service)

	if cluster == "" {
		return "", "", fmt.Errorf("cluster handle must not be empty")
	}
	if service == "" {
		return "", "", fmt.Errorf("service name must not be empty")
	}

	return cluster, service, nil
}

// resolveManifestsBaseDir returns the parent of the cloned repo when the
// harness has written its env config, otherwise the shared emptyDir mount.
// Either way the result is on the writable shared-context volume.
func resolveManifestsBaseDir() string {
	if cfg, err := environment.Load(); err == nil && cfg != nil && cfg.Dir != "" {
		return filepath.Dir(cfg.Dir)
	}
	return agentHarnessSharedDir
}

// safeJoin joins name onto base, rejecting absolute paths and any `..`
// traversal that would escape base.
func safeJoin(base, name string) (string, error) {
	if name == "" {
		return "", fmt.Errorf("empty file path")
	}
	if filepath.IsAbs(name) {
		return "", fmt.Errorf("absolute file path is not allowed")
	}

	joined := filepath.Join(base, name)
	rel, err := filepath.Rel(base, joined)
	if err != nil {
		return "", fmt.Errorf("invalid file path %q: %w", name, err)
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("file path %q escapes target directory", name)
	}
	return joined, nil
}

// sanitizeSegment normalises an untrusted value into a safe directory segment.
func sanitizeSegment(s string) string {
	s = strings.TrimSpace(s)
	s = safeNamePattern.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		return "service"
	}
	return s
}

func NewDownloadManifests(client console.Client) Tool {
	return &DownloadManifests{
		ConsoleTool: ConsoleTool{
			id: DownloadManifestsTool,
			description: "Downloads a Plural service's gitops bundle - the exact set of files " +
				"Plural ships to the cluster-side agent before apply (Helm chart sources, kustomize " +
				"bases, raw YAML, or Plural liquid templates, depending on how the service is " +
				"configured). Files are written to a dedicated '<handle>-<name>' subdirectory under " +
				"'" + manifestsSubdir + "/' next to the cloned repository. Use this to inspect " +
				"Plural's gitops layout - including external Helm charts - instead of guessing via " +
				"web searches. After it returns, inspect the listed directory with Read/Glob/Grep.",
			client: client,
		},
	}
}
