package events

import (
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"k8s.io/klog/v2"
)

type InitEvent struct {
	EventBase
	SessionID string `json:"session_id"`
	Model     string `json:"model"`
}

func (e *InitEvent) Validate() bool {
	return e.Type == EventTypeInit
}

func (e *InitEvent) Process(_ v1.MessageCallback) {
	klog.V(log.LogLevelDebug).Infof("initialized %s model", e.Model)
}
