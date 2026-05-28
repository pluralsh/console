package opencode

import (
	"context"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

func (in *Opencode) UploadArtifacts(ctx context.Context) (*artifacts.UploadArtifacts, error) {
	source := artifacts.SessionSource{Path: in.dataPath(), ArchivePath: "opencode", ExcludeNames: []string{"auth.json", "log", "logs"}}
	klog.V(log.LogLevelInfo).InfoS(
		"collecting opencode upload artifacts",
		"agentRunID", in.Config.Run.ID,
		"sessionID", in.sessionID,
		"dataHome", in.dataHome(),
		"dataPath", source.Path,
		"archivePath", source.ArchivePath,
		"excludeNames", source.ExcludeNames,
	)

	return in.BuildUploadArtifacts(ctx, artifacts.BuildArtifactsOptions{
		Provider:  "opencode",
		Source:    source,
		SessionID: in.sessionID,
		ResumeEnv: map[string]string{
			"XDG_DATA_HOME": ".",
		},
		Command: []string{"opencode", "run"},
	})
}
