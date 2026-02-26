package agent

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/module/reverse_tunnel/info"
)

type state int8

const (
	// zero value is invalid to catch initialization bugs.
	_ state = iota
	idle
	active
	stopped
)

type connectionInfo struct {
	pollCancel context.CancelFunc
	lastActive time.Time
	state      state
}

// connectionManager manages a pool of connections and their lifecycles.
type connectionManager struct {
	mu          sync.Mutex // protects connections,idleConnections,activeConnections
	connections map[connectionInterface]connectionInfo
	// Counters to track connections in those states. There may be timedOut connections in the map too.
	idleConnections   int32
	activeConnections int32

	wg wait.Group

	// minIdleConnections is the minimum number of connections that are not streaming a request.
	minIdleConnections int32
	// maxConnections is the maximum number of connections (idle and active).
	maxConnections int32
	// scaleUpStep is the number of new connections to start when below minIdleConnections.
	scaleUpStep int32
	// maxIdleTime is the maximum duration of time a connection can stay in an idle state.
	maxIdleTime       time.Duration
	connectionFactory connectionFactory
	agentDescriptor   *info.AgentDescriptor
}

func (m *connectionManager) Run(ctx context.Context) {
	defer m.wg.Wait() // blocks here until ctx is done and all connections exit
	m.mu.Lock()
	defer m.mu.Unlock()
	for m.idleConnections < m.minIdleConnections {
		m.startConnectionLocked(ctx)
	}
}

func (m *connectionManager) startConnectionLocked(rootCtx context.Context) {
	m.idleConnections++
	c := m.connectionFactory(m.agentDescriptor,
		func(c connectionInterface) {
			m.onActive(rootCtx, c)
		},
		m.onIdle)
	pollCtx, pollCancel := context.WithCancel(rootCtx)
	m.connections[c] = connectionInfo{
		pollCancel: pollCancel,
		state:      idle,
	}
	m.wg.StartWithContext(rootCtx, func(rootCtx context.Context) {
		defer m.onStop(c)
		c.Run(rootCtx, pollCtx)
	})
}

func (m *connectionManager) onActive(rootCtx context.Context, c connectionInterface) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.connections[c]
	switch i.state { // nolint: exhaustive
	case idle: // idle -> active transition
		i.state = active
		m.connections[c] = i
		m.idleConnections--
		m.activeConnections++
		if m.idleConnections < m.minIdleConnections {
			// Not enough idle connections. Must scale up the number of connections.
			// Ensure we don't go above the limit.
			scaleBy := m.scaleUpStep
			haveConnections := m.idleConnections + m.activeConnections
			canSpawnConnections := m.maxConnections - haveConnections
			if scaleBy > canSpawnConnections {
				scaleBy = canSpawnConnections
			}
			for ; scaleBy > 0; scaleBy-- {
				m.startConnectionLocked(rootCtx)
			}
		}
	case active:
		panic(errors.New("connection is already active"))
	case stopped:
		panic(errors.New("invalid state: stopped"))
	default:
		panic(fmt.Errorf("unknown state: %d", i.state))
	}
}

func (m *connectionManager) onIdle(c connectionInterface) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.connections[c]
	switch i.state { // nolint: exhaustive
	case idle:
		// Already in the idle state. This can happen if a gRPC connection was established, but never
		// transitioned into the active state.
		if m.idleConnections > m.minIdleConnections && time.Since(i.lastActive) > m.maxIdleTime {
			// Too many idle connections, can stop this one.
			i.pollCancel()
			// this counter must be decremented right when the connection is stopped so that other connections
			// don't stop too while it is off by one. i.e. cannot do this in onStop().
			m.idleConnections--
			i.state = stopped
			m.connections[c] = i
		}
	case active: // active -> idle transition
		i.state = idle
		i.lastActive = time.Now()
		m.connections[c] = i
		m.idleConnections++
		m.activeConnections--
	case stopped:
		panic(errors.New("invalid state: stopped"))
	default:
		panic(fmt.Errorf("unknown state: %d", i.state))
	}
}

func (m *connectionManager) onStop(c connectionInterface) {
	m.mu.Lock()
	defer m.mu.Unlock()
	i := m.connections[c]
	delete(m.connections, c)
	if i.state != stopped {
		// onIdle() decrements this field if maxIdleTime has been reached.
		// It's decremented here too to handle context done situation.
		m.idleConnections--
	}
}
