package logz

// Do not add more dependencies to this package as it's depended upon by the whole codebase.

import (
	"context"
	"fmt"
	"net"
	"time"

	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func NetAddressFromAddr(addr net.Addr) zap.Field {
	return NetAddress(addr.String())
}

func NetNetworkFromAddr(addr net.Addr) zap.Field {
	return NetNetwork(addr.Network())
}

func NetAddress(listenAddress string) zap.Field {
	return zap.String("net_address", listenAddress)
}

func NetNetwork(listenNetwork string) zap.Field {
	return zap.String("net_network", listenNetwork)
}

func IsWebSocket(isWebSocket bool) zap.Field {
	return zap.Bool("is_websocket", isWebSocket)
}

func AgentId(agentId int64) zap.Field {
	return zap.Int64("agent_id", agentId)
}

func ClusterId(clusterId int64) zap.Field {
	return zap.Int64("cluster_id", clusterId)
}

func CommitId(commitId string) zap.Field {
	return zap.String("commit_id", commitId)
}

// WorkerId is an id of the work source such as project id or chart name. (e.g. gitlab-org/gitlab).
func WorkerId(workerId string) zap.Field {
	return zap.String("worker_id", workerId)
}

func TraceIdFromContext(ctx context.Context) zap.Field {
	return TraceId(trace.SpanContextFromContext(ctx).TraceID())
}

func TraceId(traceId trace.TraceID) zap.Field {
	if !traceId.IsValid() {
		return zap.Skip()
	}
	return zap.String("trace_id", traceId.String())
}

// Use for any keys in Redis.
func RedisKey(key []byte) zap.Field {
	return zap.Binary("redis_key", key)
}

// Use for any integer counters.
func U64Count(count uint64) zap.Field {
	return zap.Uint64("count", count)
}

// Use for any integer counters.
func TokenLimit(limit uint64) zap.Field {
	return zap.Uint64("token_limit", limit)
}

func RemovedHashKeys(n int) zap.Field {
	return zap.Int("removed_hash_keys", n)
}

// Plural-kas or agentk module name.
func ModuleName(name string) zap.Field {
	return zap.String("mod_name", name)
}

func KasUrl(kasUrl string) zap.Field {
	return zap.String("kas_url", kasUrl)
}

func PoolConnectionUrl(poolConnUrl string) zap.Field {
	return zap.String("pool_conn_url", poolConnUrl)
}

func UrlPathPrefix(urlPrefix string) zap.Field {
	return zap.String("url_path_prefix", urlPrefix)
}

func Url(url string) zap.Field {
	return zap.String("url", url)
}

func UrlPath(url string) zap.Field {
	return zap.String("url_path", url)
}

func GrpcService(service string) zap.Field {
	return zap.String("grpc_service", service)
}

func GrpcMethod(method string) zap.Field {
	return zap.String("grpc_method", method)
}

func VulnerabilitiesCount(n int) zap.Field {
	return zap.Int("vulnerabilities_count", n)
}

func Error(err error) zap.Field {
	return zap.Error(err) // nolint:forbidigo
}

func WorkspaceName(name string) zap.Field {
	return zap.String("workspace_name", name)
}

func WorkspaceNamespace(namespace string) zap.Field {
	return zap.String("workspace_namespace", namespace)
}

func WorkspaceTerminationProgress(status string) zap.Field {
	return zap.String("workspace_termination_progress", status)
}

func StatusCode(code int32) zap.Field {
	return zap.Int32("status_code", code)
}

func RequestId(requestId string) zap.Field {
	return zap.String("request_id", requestId)
}

func DurationInMilliseconds(duration time.Duration) zap.Field {
	return zap.Int64("duration_in_ms", duration.Milliseconds())
}

func PayloadSizeInBytes(size int) zap.Field {
	return zap.Int("payload_size_in_bytes", size)
}

func WorkspaceDataCount(count int) zap.Field {
	return zap.Int("workspace_data_count", count)
}

func ProtoJsonValue(key string, value proto.Message) zap.Field {
	return zap.Inline(zapcore.ObjectMarshalerFunc(func(encoder zapcore.ObjectEncoder) error {
		data, err := protojson.Marshal(value)
		if err != nil {
			return err
		}
		encoder.AddByteString(key, data)
		return nil
	}))
}

func TargetNamespace(namespace string) zap.Field {
	return zap.String("target_namespace", namespace)
}

func PodName(podName string) zap.Field {
	return zap.String("pod_name", podName)
}

func PodStatus(podStatus string) zap.Field {
	return zap.String("pod_status", podStatus)
}

func PodLog(podLog string) zap.Field {
	return zap.String("pod_logs", podLog)
}

func NamespacedName(n string) zap.Field {
	return zap.String("namespaced_name", n)
}

func ProjectsToReconcile(p []string) zap.Field {
	return zap.Strings("projects_to_reconcile", p)
}

func GitRepositoryUrl(url string) zap.Field {
	return zap.String("gitrepository_url", url)
}

func ObjectKey(obj interface{}) zap.Field {
	return zap.Inline(zapcore.ObjectMarshalerFunc(func(encoder zapcore.ObjectEncoder) error {
		if k, ok := obj.(string); ok {
			encoder.AddString("object_key", k)
			return nil
		}
		return fmt.Errorf("unable to log object key as string, because got %[1]T: %[1]v", obj)
	}))
}

func K8sGroup(groupName string) zap.Field {
	return zap.String("k8s_group", groupName)
}

func K8sResource(resourceName string) zap.Field {
	return zap.String("k8s_resource", resourceName)
}

func InventoryName(name string) zap.Field {
	return zap.String("inventory_name", name)
}

func InventoryNamespace(namespace string) zap.Field {
	return zap.String("inventory_namespace", namespace)
}
