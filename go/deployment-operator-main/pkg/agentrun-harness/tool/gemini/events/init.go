package events

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/log"
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

func (e *InitEvent) Process(_ func(message *console.AgentMessageAttributes)) {
	klog.V(log.LogLevelDebug).Infof("initialized %s model", e.Model)
}
