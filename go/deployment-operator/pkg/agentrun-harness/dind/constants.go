package dind

import (
	"path/filepath"
)

const (
	// SharedContextVolumeName is the Kubernetes volume name for the agent repo EmptyDir.
	// Keep in sync with internal/controller/agentrun_pod.go.
	SharedContextVolumeName = "shared-context"

	// SharedContextMountPath is where the shared EmptyDir is mounted in agent-run pods.
	SharedContextMountPath = "/plural/shared"

	repositoryDirName = "repository"

	// CertsVolumePath is where the dind sidecar generates TLS material.
	CertsVolumePath = "/certs"
	// ClientCertsPath is the client cert directory consumed by the Docker CLI.
	ClientCertsPath = CertsVolumePath + "/client"
	// ClientCertStagingDir is a harness-local copy readable by the agent uid and Codex sandbox.
	ClientCertStagingDir = "/tmp/plural-docker-certs"

	DockerHostEnv = "DOCKER_HOST"
)

// RepositoryDir returns the absolute path to the cloned repository.
func RepositoryDir() string {
	return filepath.Join(SharedContextMountPath, repositoryDirName)
}
