package tunnel

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modserver"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/testhelpers"
)

var (
	_ PollingQuerier = (*AggregatingQuerier)(nil)
)

func TestPollKasUrlsByAgentId_OnlyStartsSinglePoll(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := NewMockQuerier(ctrl)
	q.EXPECT().
		KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId)
	api := mock_modserver.NewMockApi(ctrl)
	aq := NewAggregatingQuerier(zaptest.NewLogger(t), q, api, testhelpers.NewPollConfig(time.Minute), time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	go aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		assert.Fail(t, "unexpected call")
	})
	aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		assert.Fail(t, "unexpected call")
	})
}

func TestPollKasUrlsByAgentId_PollingCycle(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := NewMockQuerier(ctrl)
	q.EXPECT().
		KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId).
		Return([]string{"url1", "url2"}, nil)
	api := mock_modserver.NewMockApi(ctrl)
	aq := NewAggregatingQuerier(zaptest.NewLogger(t), q, api, testhelpers.NewPollConfig(time.Minute), time.Minute)
	call := 0
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		switch call {
		case 0:
			assert.Equal(t, []string{"url1", "url2"}, kasUrls)
		default:
			assert.FailNow(t, "unexpected invocation")
		}
		call++
	})
}

func TestPollKasUrlsByAgentId_CacheAfterStopped(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := NewMockQuerier(ctrl)
	gomock.InOrder(
		q.EXPECT().
			KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId).
			Return([]string{"url1"}, nil),
		q.EXPECT().
			KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId).
			Return([]string{"url2"}, nil),
	)
	api := mock_modserver.NewMockApi(ctrl)
	aq := NewAggregatingQuerier(zaptest.NewLogger(t), q, api, testhelpers.NewPollConfig(time.Minute), time.Minute)
	ctx, cancel := context.WithCancel(context.Background())
	aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		assert.Equal(t, []string{"url1"}, kasUrls)
		cancel()
	})
	kasUrls := aq.CachedKasUrlsByAgentId(testhelpers.AgentId) // from cache
	assert.Equal(t, []string{"url1"}, kasUrls)
	ctx, cancel = context.WithCancel(context.Background())
	aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		assert.Equal(t, []string{"url2"}, kasUrls) // from redis
		cancel()
	})
}

func TestPollKasUrlsByAgentId_CacheWhenRunning(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := NewMockQuerier(ctrl)
	api := mock_modserver.NewMockApi(ctrl)
	aq := NewAggregatingQuerier(zaptest.NewLogger(t), q, api, testhelpers.NewPollConfig(time.Second), time.Minute)
	start1 := make(chan struct{})
	gomock.InOrder(
		q.EXPECT().
			KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId).
			Return([]string{"url1"}, nil),
		q.EXPECT().
			KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId).
			DoAndReturn(func(ctx context.Context, agentId int64) ([]string, error) {
				close(start1)                      // start concurrent query
				assert.Eventually(t, func() bool { // wait for aq.PollKasUrlsByAgentId() to register second callback
					aq.mu.Lock()
					defer aq.mu.Unlock()
					return len(aq.listeners[agentId].consumers) == 2
				}, time.Second, 10*time.Millisecond)
				return []string{"url2"}, nil
			}),
	)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	count1 := 0
	go aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		switch count1 {
		case 0:
			assert.Equal(t, []string{"url1"}, kasUrls) // first call
		case 1:
			assert.Equal(t, []string{"url2"}, kasUrls) // second call
		default:
			assert.FailNow(t, "unexpected invocation")
		}
		count1++
	})
	<-start1
	kasUrls := aq.CachedKasUrlsByAgentId(testhelpers.AgentId)
	assert.Equal(t, []string{"url1"}, kasUrls) // from cache
	count2 := 0
	ctx2, cancel2 := context.WithCancel(context.Background())
	defer cancel2()
	aq.PollKasUrlsByAgentId(ctx2, testhelpers.AgentId, func(kasUrls []string) {
		switch count2 {
		case 0:
			assert.Equal(t, []string{"url2"}, kasUrls) // from redis
			cancel2()
		default:
			assert.FailNow(t, "unexpected invocation")
		}
		count2++
	})
	assert.EqualValues(t, 1, count2)
}

func TestPollKasUrlsByAgentId_GcRemovesExpiredCache(t *testing.T) {
	ctrl := gomock.NewController(t)
	q := NewMockQuerier(ctrl)
	q.EXPECT().
		KasUrlsByAgentId(gomock.Any(), testhelpers.AgentId).
		Return([]string{"url1"}, nil)
	api := mock_modserver.NewMockApi(ctrl)
	gcPeriod := time.Second
	aq := NewAggregatingQuerier(zaptest.NewLogger(t), q, api, testhelpers.NewPollConfig(time.Minute), gcPeriod)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	aq.PollKasUrlsByAgentId(ctx, testhelpers.AgentId, func(kasUrls []string) {
		cancel()
	})
	ctx, cancel = context.WithCancel(context.Background())
	var wg wait.Group
	defer wg.Wait()
	defer cancel()
	wg.Start(func() {
		_ = aq.Run(ctx)
	})
	time.Sleep(gcPeriod * 2)
	kasUrls := aq.CachedKasUrlsByAgentId(testhelpers.AgentId)
	assert.Empty(t, kasUrls)
}
