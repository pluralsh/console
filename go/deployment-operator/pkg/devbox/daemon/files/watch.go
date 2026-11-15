package files

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
	"google.golang.org/grpc/codes"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
)

// MaxWatchedDirs caps a recursive watch.
const MaxWatchedDirs = 8192

// renamePairWindow is how long a rename-away waits for its matching create before it is reported as a delete.
const renamePairWindow = 100 * time.Millisecond

// skipDirs are never watched recursively.
var skipDirs = map[string]bool{".git": true, "node_modules": true, ".cache": true}

// Watch streams changes under a path until ctx ends or send fails.
func (s *Service) Watch(ctx context.Context, req *devboxv1.WatchFilesRequest, send func(*devboxv1.FileEvent) error) error {
	root, err := s.Resolve(req.GetPath())
	if err != nil {
		return err
	}
	st, err := os.Stat(root)
	if err != nil {
		return ioError(err, req.GetPath())
	}
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return derr.New(codes.Internal, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
	}
	defer w.Close()
	ws := &watchSession{w: w, recursive: req.GetRecursive(), send: send}
	if st.IsDir() {
		ws.addTree(root)
	} else {
		ws.add(root)
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ws.renameTimer:
			if err := ws.flushRename(); err != nil {
				return err
			}
		case _, ok := <-w.Errors:
			if !ok {
				return nil
			}
		case ev, ok := <-w.Events:
			if !ok {
				return nil
			}
			if !st.IsDir() && ev.Name != root {
				continue
			}
			if err := ws.handle(ev); err != nil {
				return err
			}
		}
	}
}

type watchSession struct {
	w         *fsnotify.Watcher
	recursive bool
	send      func(*devboxv1.FileEvent) error
	watched   int

	pendingRename string
	renameTimer   <-chan time.Time
}

func (ws *watchSession) add(dir string) {
	if ws.watched >= MaxWatchedDirs {
		return
	}
	if ws.w.Add(dir) == nil {
		ws.watched++
	}
}

func (ws *watchSession) addTree(dir string) {
	if !ws.recursive {
		ws.add(dir)
		return
	}
	_ = filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if p != dir && skipDirs[d.Name()] {
				return filepath.SkipDir
			}
			ws.add(p)
			if ws.watched >= MaxWatchedDirs {
				return filepath.SkipAll
			}
		}
		return nil
	})
}

func (ws *watchSession) emit(t devboxv1.FileEventType, path, old string) error {
	ev := &devboxv1.FileEvent{Type: t, Path: path, OldPath: old}
	if t != devboxv1.FileEventType_FILE_EVENT_TYPE_DELETED {
		if info, err := os.Lstat(path); err == nil {
			ev.Entry = entryOf(path, info)
		}
	}
	return ws.send(ev)
}

func (ws *watchSession) flushRename() error {
	if ws.pendingRename == "" {
		return nil
	}
	p := ws.pendingRename
	ws.pendingRename, ws.renameTimer = "", nil
	return ws.emit(devboxv1.FileEventType_FILE_EVENT_TYPE_DELETED, p, "")
}

func (ws *watchSession) handle(ev fsnotify.Event) error {
	switch {
	case ev.Has(fsnotify.Create):
		if info, err := os.Lstat(ev.Name); err == nil && info.IsDir() && ws.recursive && !skipDirs[filepath.Base(ev.Name)] {
			ws.addTree(ev.Name)
		}
		if ws.pendingRename != "" {
			old := ws.pendingRename
			ws.pendingRename, ws.renameTimer = "", nil
			return ws.emit(devboxv1.FileEventType_FILE_EVENT_TYPE_RENAMED, ev.Name, old)
		}
		return ws.emit(devboxv1.FileEventType_FILE_EVENT_TYPE_CREATED, ev.Name, "")
	case ev.Has(fsnotify.Rename):
		if err := ws.flushRename(); err != nil {
			return err
		}
		ws.pendingRename = ev.Name
		ws.renameTimer = time.After(renamePairWindow)
	case ev.Has(fsnotify.Remove):
		return ws.emit(devboxv1.FileEventType_FILE_EVENT_TYPE_DELETED, ev.Name, "")
	case ev.Has(fsnotify.Write), ev.Has(fsnotify.Chmod):
		return ws.emit(devboxv1.FileEventType_FILE_EVENT_TYPE_MODIFIED, ev.Name, "")
	}
	return nil
}
