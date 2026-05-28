package tool

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	securejoin "github.com/cyphar/filepath-securejoin"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	console "github.com/pluralsh/console/go/deployment-operator/pkg/client"
)

// Per-service trees land at "<base>/<manifestsSubdir>/<handle>-<service>/".
const manifestsSubdir = "manifests"

// safeNamePattern intentionally excludes `.` so that handles like `..` collapse
// to `-` and ultimately fall back to the sanitizeSegment sentinel rather than
// producing surprising directory names like `..-myservice`.
var safeNamePattern = regexp.MustCompile(`[^a-zA-Z0-9_-]+`)

func (in *DownloadManifests) Install(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool(
			in.id.String(),
			mcp.WithDescription(in.description),
		mcp.WithString("cluster",
			mcp.Required(),
			mcp.Description("Handle of the Plural cluster the service is deployed to. "+
				"This is the `.spec.handle` field on the Cluster CR, not its metadata.name. "+
				"Examples: 'mgmt', 'prod-eu-1'."),
		),
		mcp.WithString("service",
			mcp.Required(),
			mcp.Description("Name of the ServiceDeployment whose rendered manifests should be downloaded. "+
				"Use `.metadata.name` from the ServiceDeployment CR. "+
				"For a GlobalService, this is the name of the per-cluster child ServiceDeployment it created."),
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

		if file.Path == "" {
			return mcp.NewToolResultError(fmt.Sprintf("refusing to write empty file path from service %q", serviceName)), nil
		}
		// SecureJoin lexically and symlink-safely anchors file.Path under
		// targetDir; an attempt to escape via "..", absolute paths, or
		// symlinks resolves back inside targetDir.
		path, err := securejoin.SecureJoin(targetDir, file.Path)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("refusing to write %q from service %q: %v", file.Path, serviceName, err)), nil
		}

		// Strip any trailing `=` padding and decode with RawStdEncoding so we
		// accept both padded standard base64 and the unpadded variant that
		// some Console releases may emit.
		content, err := base64.RawStdEncoding.DecodeString(strings.TrimRight(file.Content, "="))
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
	return dind.SharedContextMountPath
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
			description: "Downloads the rendered Kubernetes manifests for a Plural ServiceDeployment " +
				"(or a per-cluster instance created by a GlobalService). " +
				"Pass the cluster *handle* (the value of `.spec.handle` on the Cluster CR, " +
				"e.g. 'mgmt', 'prod-eu-1') as 'cluster', " +
				"and the ServiceDeployment name (`.metadata.name` on the ServiceDeployment CR) as 'service'. " +
				"For a GlobalService CR, first identify which per-cluster child ServiceDeployment you want to inspect " +
				"(the GlobalService creates one per targeted cluster), then pass that cluster's handle and the child service name. " +
				"NOTE: InfrastructureStack CRs are not supported by this tool — use kubectl or Bash to inspect stack state instead. " +
				"Files are written to a '<handle>-<name>/' subdirectory under '" + manifestsSubdir + "/' next to the cloned repository " +
				"(Helm chart sources, kustomize bases, raw YAML, or Plural liquid templates, depending on how the service is configured). " +
				"Use this to inspect Plural's gitops layout — including external Helm charts — instead of guessing via web searches. " +
				"After it returns, inspect the listed directory with Read/Glob/Grep.",
			client: client,
		},
	}
}
