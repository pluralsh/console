package persist

import (
	"context"
	"os"
	"time"

	"k8s.io/klog/v2"
)

type Store struct {
	dir  string
	lock *os.File
}

func Open(dir string) (*Store, error) {
	if dir == "" {
		return &Store{}, nil
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}

	lock, err := tryExclusiveLock(dir)
	if err != nil {
		klog.InfoS("cache dir already in use, falling back to ephemeral cache", "dir", dir, "error", err)
		return &Store{}, nil
	}

	return &Store{dir: dir, lock: lock}, nil
}

func (s *Store) Enabled() bool {
	return s != nil && s.lock != nil
}

func (s *Store) Dir() string {
	if !s.Enabled() {
		return ""
	}
	return s.dir
}

func (s *Store) Close() error {
	if s == nil {
		return nil
	}

	err := releaseLock(s.lock)
	s.lock = nil
	return err
}

func (s *Store) StartPeriodic(ctx context.Context, interval time.Duration, save func() error) {
	if !s.Enabled() || interval <= 0 || save == nil {
		return
	}

	go func() {
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
