package syncz

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/util/wait"
)

func TestSubscriptions_DispatchingMultiple(t *testing.T) {
	// GIVEN
	var wg wait.Group
	defer wg.Wait()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var s Subscriptions[int]
	x := 42
	// recorder for callback hits
	rec1 := make(chan struct{})
	rec2 := make(chan struct{})
	subscriber1 := func(_ context.Context, e int) {
		assert.EqualValues(t, x, e)
		close(rec1)
	}
	subscriber2 := func(_ context.Context, e int) {
		assert.EqualValues(t, x, e)
		close(rec2)
	}

	// WHEN
	// starting multiple subscribers
	wg.Start(func() {
		s.On(ctx, subscriber1)
	})
	wg.Start(func() {
		s.On(ctx, subscriber2)
	})

	// give the OnGitPushEvent goroutines time to be scheduled and registered
	assert.Eventually(t, func() bool {
		s.mu.Lock()
		defer s.mu.Unlock()
		return len(s.subs) == 2
	}, time.Minute, time.Millisecond)

	// dispatch a single event
	s.Dispatch(ctx, x)

	// THEN
	<-rec1
	<-rec2
}

func TestSubscriptions_AddRemove(t *testing.T) {
	var s Subscriptions[int]

	sb1 := sub[int]{ch: make(chan<- int)}
	sb2 := sub[int]{ch: make(chan<- int)}
	sb3 := sub[int]{ch: make(chan<- int)}

	s.add(sb1)
	s.add(sb2)
	s.add(sb3)

	assert.Equal(t, sb1, s.subs[0])
	assert.Equal(t, sb2, s.subs[1])
	assert.Equal(t, sb3, s.subs[2])

	s.remove(sb2)

	assert.Equal(t, sb1, s.subs[0])
	assert.Equal(t, sb3, s.subs[1])
	assert.Equal(t, sub[int]{}, s.subs[:3:3][2])

	s.remove(sb1)
	s.remove(sb3)
	assert.Equal(t, sub[int]{}, s.subs[:3:3][0])
	assert.Equal(t, sub[int]{}, s.subs[:3:3][1])
	assert.Empty(t, s.subs)
}

func TestSubscriptions_ConcurrentCancel(t *testing.T) {
	var s Subscriptions[int]

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancelled right here

	var wg wait.Group
	defer wg.Wait()

	for i := 0; i < 10; i++ {
		wg.Start(func() {
			s.On(ctx, func(ctx context.Context, e int) {})
		})
		wg.Start(func() {
			s.Dispatch(context.Background(), 42)
		})
	}
}
