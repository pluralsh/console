// Package clock abstracts time so the daemon's timers (idle detection, settling, credential rotation) can be
// driven by a fake clock in tests.
package clock

import (
	"sync"
	"time"
)

// Clock is the subset of the time package the daemon uses.
type Clock interface {
	Now() time.Time
	// Since is Now().Sub(t), using the monotonic reading when t carries one.
	Since(t time.Time) time.Duration
	// NewTicker returns a ticker whose channel fires every d.
	NewTicker(d time.Duration) Ticker
	// After fires once after d.
	After(d time.Duration) <-chan time.Time
}

// Ticker is a stoppable ticker.
type Ticker interface {
	C() <-chan time.Time
	Stop()
}

// Real is the wall clock.
type Real struct{}

func (Real) Now() time.Time                         { return time.Now() }
func (Real) Since(t time.Time) time.Duration        { return time.Since(t) }
func (Real) After(d time.Duration) <-chan time.Time { return time.After(d) }
func (Real) NewTicker(d time.Duration) Ticker       { return realTicker{time.NewTicker(d)} }

type realTicker struct{ t *time.Ticker }

func (r realTicker) C() <-chan time.Time { return r.t.C }
func (r realTicker) Stop()               { r.t.Stop() }

// Fake is a manually advanced clock. Tickers and timers fire synchronously from Advance.
type Fake struct {
	mu      sync.Mutex
	now     time.Time
	tickers []*fakeTicker
	timers  []*fakeTimer
}

// NewFake returns a fake clock starting at start.
func NewFake(start time.Time) *Fake {
	return &Fake{now: start}
}

func (f *Fake) Now() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.now
}

func (f *Fake) Since(t time.Time) time.Duration { return f.Now().Sub(t) }

func (f *Fake) After(d time.Duration) <-chan time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	ch := make(chan time.Time, 1)
	f.timers = append(f.timers, &fakeTimer{at: f.now.Add(d), ch: ch})
	return ch
}

func (f *Fake) NewTicker(d time.Duration) Ticker {
	f.mu.Lock()
	defer f.mu.Unlock()
	t := &fakeTicker{every: d, next: f.now.Add(d), ch: make(chan time.Time, 1), clock: f}
	f.tickers = append(f.tickers, t)
	return t
}

// Set jumps the clock to t without firing tickers in between (like a wall clock jump after a memory restore).
func (f *Fake) Set(t time.Time) {
	f.mu.Lock()
	f.now = t
	for _, tk := range f.tickers {
		tk.next = t.Add(tk.every)
	}
	f.mu.Unlock()
}

// Advance moves the clock forward, firing due timers and tickers.
func (f *Fake) Advance(d time.Duration) {
	f.mu.Lock()
	f.now = f.now.Add(d)
	now := f.now
	remaining := f.timers[:0]
	var fire []*fakeTimer
	for _, t := range f.timers {
		if !t.at.After(now) {
			fire = append(fire, t)
		} else {
			remaining = append(remaining, t)
		}
	}
	f.timers = remaining
	var ticks []*fakeTicker
	for _, tk := range f.tickers {
		if tk.stopped {
			continue
		}
		if !tk.next.After(now) {
			ticks = append(ticks, tk)
			for !tk.next.After(now) {
				tk.next = tk.next.Add(tk.every)
			}
		}
	}
	f.mu.Unlock()
	for _, t := range fire {
		t.ch <- now
	}
	for _, tk := range ticks {
		select {
		case tk.ch <- now:
		default:
		}
	}
}

type fakeTimer struct {
	at time.Time
	ch chan time.Time
}

type fakeTicker struct {
	every   time.Duration
	next    time.Time
	ch      chan time.Time
	stopped bool
	clock   *Fake
}

func (t *fakeTicker) C() <-chan time.Time { return t.ch }

func (t *fakeTicker) Stop() {
	t.clock.mu.Lock()
	t.stopped = true
	t.clock.mu.Unlock()
}
