package acp

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"sync"
	"time"
)

// orderedRequests are the requests about entities the agent announced just before them.
var orderedRequests = map[string]bool{
	MethodRequestPermission: true,
	MethodElicitationCreate: true,
}

// requestOrderWait caps how long an agent's request waits for the notifications sent before it.
const requestOrderWait = 2 * time.Second

// inboundOrder makes an agent's request wait for the notifications it sent before it. The SDK runs requests
// concurrently with its notification queue, so a permission request could otherwise be handled before the
// session/update announcing the tool call it is about.
type inboundOrder struct {
	mu      sync.Mutex
	arrived uint64
	handled uint64
	changed chan struct{}
}

func newInboundOrder() *inboundOrder { return &inboundOrder{changed: make(chan struct{})} }

func (o *inboundOrder) arrive() {
	o.mu.Lock()
	o.arrived++
	o.mu.Unlock()
}

func (o *inboundOrder) handledOne() {
	o.mu.Lock()
	o.handled++
	close(o.changed)
	o.changed = make(chan struct{})
	o.mu.Unlock()
}

// catchUp waits until every notification read so far has been handled.
func (o *inboundOrder) catchUp(ctx context.Context) {
	o.mu.Lock()
	target := o.arrived
	o.mu.Unlock()
	deadline := time.NewTimer(requestOrderWait)
	defer deadline.Stop()
	for {
		o.mu.Lock()
		done, changed := o.handled >= target, o.changed
		o.mu.Unlock()
		if done {
			return
		}
		select {
		case <-changed:
		case <-ctx.Done():
			return
		case <-deadline.C:
			return
		}
	}
}

// orderedReader counts notifications as the SDK reads them off the wire, ahead of their dispatch.
type orderedReader struct {
	r    io.Reader
	o    *inboundOrder
	line []byte
}

func (or *orderedReader) Read(p []byte) (int, error) {
	n, err := or.r.Read(p)
	data := p[:n]
	for len(data) > 0 {
		i := bytes.IndexByte(data, '\n')
		if i < 0 {
			or.line = append(or.line, data...)
			break
		}
		or.line = append(or.line, data[:i]...)
		or.count(or.line)
		or.line = or.line[:0]
		data = data[i+1:]
	}
	return n, err
}

func (or *orderedReader) count(line []byte) {
	var head struct {
		ID     json.RawMessage `json:"id"`
		Method string          `json:"method"`
	}
	if json.Unmarshal(line, &head) == nil && len(head.ID) == 0 && notificationMethods[head.Method] {
		or.o.arrive()
	}
}
