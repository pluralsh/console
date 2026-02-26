package syncz

import (
	"context"

	"google.golang.org/protobuf/proto"
	"k8s.io/apimachinery/pkg/util/wait"
)

type Worker interface {
	Run(context.Context)
}

type WorkerFunc func(context.Context)

func (wf WorkerFunc) Run(ctx context.Context) {
	wf(ctx)
}

// WorkerHolder holds a worker and restarts it when configuration changes.
type WorkerHolder[C any] struct {
	factory func(config C) Worker
	isEqual func(config1, config2 C) bool

	wg            wait.Group
	currentCancel context.CancelFunc
	currentConfig C
}

func NewWorkerHolder[C any](factory func(C) Worker, isEqual func(config1, config2 C) bool) *WorkerHolder[C] {
	return &WorkerHolder[C]{
		factory: factory,
		isEqual: isEqual,
	}
}

func NewComparableWorkerHolder[C comparable](factory func(C) Worker) *WorkerHolder[C] {
	return &WorkerHolder[C]{
		factory: factory,
		isEqual: func(config1, config2 C) bool {
			return config1 == config2
		},
	}
}

func NewProtoWorkerHolder[C proto.Message](factory func(C) Worker) *WorkerHolder[C] {
	return &WorkerHolder[C]{
		factory: factory,
		isEqual: func(config1, config2 C) bool {
			return proto.Equal(config1, config2)
		},
	}
}

// ApplyConfig ensures a worker is running with the provided or equal config.
//
// This method starts a worker if it's not running already. If it is running and the config is not equal
// then the worker is stopped, a new worker is started then with the new config.
func (w *WorkerHolder[C]) ApplyConfig(ctx context.Context, config C) bool {
	if w.currentCancel != nil {
		if w.isEqual(config, w.currentConfig) {
			return false
		}
		w.currentCancel()
		w.wg.Wait()
	}
	w.currentConfig = config
	ctx, w.currentCancel = context.WithCancel(ctx)
	worker := w.factory(config)
	w.wg.StartWithContext(ctx, worker.Run)
	return true
}

func (w *WorkerHolder[C]) StopAndWait() {
	if w.currentCancel == nil {
		return // nothing to do
	}
	var c C
	w.currentConfig = c
	w.currentCancel()
	w.currentCancel = nil
	w.wg.Wait()
}
