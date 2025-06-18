package connection

import (
	"sync"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

type Tracer struct {
	messages []string
	mu       sync.Mutex
}

func (t *Tracer) Write(p []byte) (n int, err error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	klog.V(log.LogLevelDebug).Infof("tracing message: %s", p)
	t.messages = append(t.messages, string(p))
	return len(p), nil
}

func (t *Tracer) GetMessages() []string {
	t.mu.Lock()
	defer t.mu.Unlock()

	messages := make([]string, len(t.messages))
	copy(messages, t.messages)
	t.messages = make([]string, 0)

	return messages
}

func NewTracer() *Tracer {
	return &Tracer{
		messages: make([]string, 0),
	}
}
