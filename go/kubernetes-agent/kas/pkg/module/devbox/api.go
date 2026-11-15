package devbox

import (
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/kubernetes-agent/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/httpz"
	"github.com/pluralsh/console/go/kubernetes-agent/pkg/tool/uuid"
)

const (
	ModuleName = "devbox"

	// StreamsPathSegment follows the listener's url_path_prefix in browser stream URLs:
	// <prefix>/streams/<stream_id>[/<suffix>].
	StreamsPathSegment = "/streams/"

	// ConsoleJwtAudience is the audience of the JWT KAS sends with forwarded Ingest calls.
	ConsoleJwtAudience = "plural-console"

	clusterOfflineMessage = "the cluster's devbox gateway is not connected"
)

// AgentIdForCluster maps a console cluster ID to the key gateway tunnels are registered under. It is the same
// mapping KAS uses for agentk (see plural.GetAgentInfo), so a cluster's AgentInfo.Id matches.
func AgentIdForCluster(clusterId string) (int64, error) {
	if clusterId == "" {
		return 0, status.Errorf(codes.InvalidArgument, "missing %s metadata", devboxv1.ClusterIDMetadataKey)
	}
	id, err := uuid.ToInt64(clusterId)
	if err != nil {
		return 0, status.Errorf(codes.InvalidArgument, "invalid %s metadata: %v", devboxv1.ClusterIDMetadataKey, err)
	}
	return id, nil
}

// ClusterOfflineError is returned when no gateway tunnel is connected for a cluster: UNAVAILABLE with an
// ErrorDetail{CLUSTER_OFFLINE}, which console maps to "cluster offline" and falls back to its index.
func ClusterOfflineError() error {
	st := status.New(codes.Unavailable, clusterOfflineMessage)
	withDetails, err := st.WithDetails(&devboxv1.ErrorDetail{
		Reason:  devboxv1.ErrorReason_ERROR_REASON_CLUSTER_OFFLINE,
		Message: clusterOfflineMessage,
	})
	if err != nil {
		return st.Err()
	}
	return withDetails.Err()
}

// StripCredentials removes caller credentials from metadata that is about to cross a trust boundary: the
// console JWT must never reach a gateway and a gateway's deploy token must never reach console.
func StripCredentials(md metadata.MD) metadata.MD {
	md = md.Copy()
	delete(md, strings.ToLower(httpz.AuthorizationHeader))
	return md
}
