package datasource

import (
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/pluralsh/console/go/cloud-query/internal/proto/toolquery"
)

type ElasticSource struct {
	Cluster struct {
		Name   string `json:"name"`
		Handle string `json:"handle"`
	} `json:"cluster"`

	Agent struct {
		Name        string `json:"name"`
		Version     string `json:"version"`
		ID          string `json:"id"`
		Type        string `json:"type"`
		EphemeralID string `json:"ephemeral_id"`
	} `json:"agent"`

	Kubernetes struct {
		Pod struct {
			Name string `json:"name"`
			IP   string `json:"ip"`
			UID  string `json:"uid"`
		} `json:"pod"`
		Namespace string `json:"namespace"`
		Container struct {
			Name string `json:"name"`
		} `json:"container"`
		Node struct {
			Name string `json:"name"`
		} `json:"node"`
	} `json:"kubernetes"`

	Host struct {
		OS struct {
			Version  string `json:"version"`
			Platform string `json:"platform"`
			Codename string `json:"codename"`
			Kernel   string `json:"kernel"`
			Name     string `json:"name"`
			Family   string `json:"family"`
			Type     string `json:"type"`
		} `json:"os"`
		Hostname      string   `json:"hostname"`
		Architecture  string   `json:"architecture"`
		Name          string   `json:"name"`
		Containerized bool     `json:"containerized"`
		IP            []string `json:"ip"`
		MAC           []string `json:"mac"`
	} `json:"host"`

	Message string `json:"message"`

	Timestamp string `json:"@timestamp"`
}

func (s *ElasticSource) ToLogsQueryOutput() (*toolquery.LogEntry, error) {
	timestamp := time.Now()
	if s.Timestamp != "" {
		parsed, err := time.Parse(time.RFC3339Nano, s.Timestamp)
		if err != nil {
			return nil, err
		}
		timestamp = parsed
	}

	labels := map[string]string{}
	if s.Cluster.Name != "" {
		labels["cluster.name"] = s.Cluster.Name
	}
	if s.Cluster.Handle != "" {
		labels["cluster.handle"] = s.Cluster.Handle
	}
	if s.Agent.Name != "" {
		labels["agent.name"] = s.Agent.Name
	}
	if s.Agent.Type != "" {
		labels["agent.type"] = s.Agent.Type
	}
	if s.Agent.Version != "" {
		labels["agent.version"] = s.Agent.Version
	}
	if s.Kubernetes.Namespace != "" {
		labels["kubernetes.namespace"] = s.Kubernetes.Namespace
	}
	if s.Kubernetes.Pod.Name != "" {
		labels["kubernetes.pod.name"] = s.Kubernetes.Pod.Name
	}
	if s.Kubernetes.Container.Name != "" {
		labels["kubernetes.container.name"] = s.Kubernetes.Container.Name
	}
	if s.Kubernetes.Node.Name != "" {
		labels["kubernetes.node.name"] = s.Kubernetes.Node.Name
	}
	if s.Host.Name != "" {
		labels["host.name"] = s.Host.Name
	}
	if s.Host.Hostname != "" {
		labels["host.hostname"] = s.Host.Hostname
	}
	if s.Host.Architecture != "" {
		labels["host.architecture"] = s.Host.Architecture
	}

	return &toolquery.LogEntry{
		Timestamp: timestamppb.New(timestamp),
		Message:   s.Message,
		Labels:    labels,
	}, nil
}
