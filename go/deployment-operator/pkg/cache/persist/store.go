package persist

import (
	"context"
	"os"
	"sync"
	"time"

	"k8s.io/klog/v2"
)

type Store struct {
	dir        string
	mu         sync.Mutex
	wg         sync.WaitGroup
	loggedSave sync.Once
}

func Open(dir string) (*Store, error) {
	if dir == "" {
		klog.InfoS("durable cache disabled")
		return &Store{}, nil
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}

	klog.InfoS("durable cache initialized", "dir", dir)
	return &Store{dir: dir}, nil
}

func (s *Store) Enabled() bool {
	return s != nil && s.dir != ""
}

func (s *Store) Dir() string {
	if !s.Enabled() {
		return ""
	}
	return s.dir
}

func (s *Store) Close() error {
	return nil
}

func (s *Store) StartPeriodic(ctx context.Context, interval time.Duration, save func() error) {
	if !s.Enabled() || interval <= 0 || save == nil {
		return
	}

	s.wg.Add(1)
	klog.InfoS("started periodic cache persist", "interval", interval, "dir", s.dir)
	go func() {
		defer s.wg.Done()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := save(); err != nil {
					klog.ErrorS(err, "unable to persist cache snapshot")
				}
			}
		}
	}()
}

func (s *Store) WaitPeriodic() {
	if s == nil {
		return
	}
	s.wg.Wait()
}
