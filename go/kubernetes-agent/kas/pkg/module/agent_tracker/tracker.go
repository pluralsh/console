package agent_tracker

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/redis/rueidis"
	"go.uber.org/zap"
	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/proto"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/redistool"
)

const (
	refreshOverlap           = 5 * time.Second
	connectedAgentsKey int64 = 0
)

type ConnectedAgentInfoCallback func(*ConnectedAgentInfo) (done bool, err error)

type Registerer interface {
	// RegisterConnection registers connection with the tracker.
	RegisterConnection(ctx context.Context, info *ConnectedAgentInfo) error
	// UnregisterConnection unregisters connection with the tracker.
	UnregisterConnection(ctx context.Context, info *ConnectedAgentInfo) error
}

type Querier interface {
	GetConnectionsByAgentId(ctx context.Context, agentId int64, cb ConnectedAgentInfoCallback) error
	GetConnectedAgentsCount(ctx context.Context) (int64, error)
}

type Tracker interface {
	Registerer
	Querier
	Run(ctx context.Context) error
}

type RedisTracker struct {
	log           *zap.Logger
	errRep        errz.ErrReporter
	refreshPeriod time.Duration
	gcPeriod      time.Duration

	// mu protects fields below
	mu                   sync.Mutex
	connectionsByAgentId redistool.ExpiringHash[int64, int64] // agentId -> connectionId -> info
	connectedAgents      redistool.ExpiringHash[int64, int64] // hash name -> agentId -> ""
}

func NewRedisTracker(log *zap.Logger, errRep errz.ErrReporter, client rueidis.Client, agentKeyPrefix string, ttl, refreshPeriod, gcPeriod time.Duration) *RedisTracker {
	return &RedisTracker{
		log:                  log,
		errRep:               errRep,
		refreshPeriod:        refreshPeriod,
		gcPeriod:             gcPeriod,
		connectionsByAgentId: redistool.NewRedisExpiringHash(client, connectionsByAgentIdHashKey(agentKeyPrefix), int64ToStr, ttl),
		connectedAgents:      redistool.NewRedisExpiringHash(client, connectedAgentsHashKey(agentKeyPrefix), int64ToStr, ttl),
	}
}

func (t *RedisTracker) Run(ctx context.Context) error {
	refreshTicker := time.NewTicker(t.refreshPeriod)
	defer refreshTicker.Stop()
	gcTicker := time.NewTicker(t.gcPeriod)
	defer gcTicker.Stop()
	done := ctx.Done()
	for {
		select {
		case <-done:
			return nil
		case <-refreshTicker.C:
			t.refreshRegistrations(ctx, time.Now().Add(t.refreshPeriod-refreshOverlap))
		case <-gcTicker.C:
			keysDeleted := t.runGC(ctx)
			if keysDeleted > 0 {
				t.log.Info("Deleted expired agent connections records", logz.RemovedHashKeys(keysDeleted))
			}
		}
	}
}

func (t *RedisTracker) RegisterConnection(ctx context.Context, info *ConnectedAgentInfo) error {
	infoBytes, err := proto.Marshal(info)
	if err != nil {
		// This should never happen
		return fmt.Errorf("failed to marshal object: %w", err)
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	var wg errgroup.Group
	// wg.Go(func() error {
	//	return t.connectionsByClusterId.Set(ctx, info.ProjectId, info.ConnectionId, infoBytes)
	// })
	wg.Go(func() error {
		return t.connectionsByAgentId.Set(ctx, info.AgentId, info.ConnectionId, infoBytes)
	})
	wg.Go(func() error {
		return t.connectedAgents.Set(ctx, connectedAgentsKey, info.AgentId, nil)
	})
	return wg.Wait()
}

func (t *RedisTracker) UnregisterConnection(ctx context.Context, info *ConnectedAgentInfo) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	var wg errgroup.Group
	// wg.Go(func() error {
	//	return t.connectionsByClusterId.Unset(ctx, info.ProjectId, info.ConnectionId)
	// })
	wg.Go(func() error {
		return t.connectionsByAgentId.Unset(ctx, info.AgentId, info.ConnectionId)
	})
	t.connectedAgents.Forget(connectedAgentsKey, info.AgentId)
	return wg.Wait()
}

func (t *RedisTracker) GetConnectionsByAgentId(ctx context.Context, agentId int64, cb ConnectedAgentInfoCallback) error {
	return t.getConnectionsByKey(ctx, t.connectionsByAgentId, agentId, cb)
}

func (t *RedisTracker) GetConnectedAgentsCount(ctx context.Context) (int64, error) {
	return t.connectedAgents.Len(ctx, connectedAgentsKey)
}

func (t *RedisTracker) refreshRegistrations(ctx context.Context, nextRefresh time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()
	// Run refreshes concurrently to release mu ASAP.
	var wg wait.Group
	t.refreshHash(ctx, &wg, t.connectionsByAgentId, nextRefresh)
	t.refreshHash(ctx, &wg, t.connectedAgents, nextRefresh)
	wg.Wait()
}

func (t *RedisTracker) refreshHash(ctx context.Context, wg *wait.Group, h redistool.ExpiringHash[int64, int64], nextRefresh time.Time) {
	wg.Start(func() {
		err := h.Refresh(ctx, nextRefresh)
		if err != nil {
			t.errRep.HandleProcessingError(ctx, t.log, "Failed to refresh hash data in Redis", err)
		}
	})
}

func (t *RedisTracker) runGC(ctx context.Context) int {
	var gcFuncs []func(context.Context) (int, error)
	func() {
		t.mu.Lock()
		defer t.mu.Unlock()
		gcFuncs = []func(context.Context) (int, error){
			t.connectionsByAgentId.GC(),
			t.connectedAgents.GC(),
		}
	}()
	keysDeleted := 0
	// No rush so run GC sequentially to not stress RAM/CPU/Redis/network.
	// We have more important work to do that we shouldn't impact.
	for _, gc := range gcFuncs {
		deleted, err := gc(ctx)
		keysDeleted += deleted
		if err != nil {
			if errz.ContextDone(err) {
				t.log.Debug("Redis GC interrupted", logz.Error(err))
				break
			}
			t.errRep.HandleProcessingError(ctx, t.log, "Failed to GC data in Redis", err)
			// continue anyway
		}
	}
	return keysDeleted
}

func (t *RedisTracker) getConnectionsByKey(ctx context.Context, hash redistool.ExpiringHash[int64, int64], key int64, cb ConnectedAgentInfoCallback) error {
	_, err := hash.Scan(ctx, key, func(rawHashKey string, value []byte, err error) (bool, error) {
		if err != nil {
			t.errRep.HandleProcessingError(ctx, t.log, "Redis hash scan", err)
			return false, nil
		}
		var info ConnectedAgentInfo
		err = proto.Unmarshal(value, &info)
		if err != nil {
			t.errRep.HandleProcessingError(ctx, t.log, "Redis proto.Unmarshal(ConnectedAgentInfo)", err)
			return false, nil
		}
		return cb(&info)
	})
	return err
}

// connectionsByAgentIdHashKey returns a key for agentId -> (connectionId -> marshaled ConnectedAgentInfo).
func connectionsByAgentIdHashKey(agentKeyPrefix string) redistool.KeyToRedisKey[int64] {
	prefix := agentKeyPrefix + ":conn_by_agent_id:"
	return func(agentId int64) string {
		return redistool.PrefixedInt64Key(prefix, agentId)
	}
}

// connectedAgentsHashKey returns the key for the hash of connected agents.
func connectedAgentsHashKey(agentKeyPrefix string) redistool.KeyToRedisKey[int64] {
	prefix := agentKeyPrefix + ":connected_agents"
	return func(_ int64) string {
		return prefix
	}
}

type ConnectedAgentInfoCollector []*ConnectedAgentInfo

func (c *ConnectedAgentInfoCollector) Collect(info *ConnectedAgentInfo) (bool, error) {
	*c = append(*c, info)
	return false, nil
}

func int64ToStr(key int64) string {
	return strconv.FormatInt(key, 10)
}
