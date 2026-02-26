package modagent

import (
	"context"
	"fmt"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/logz"

	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
	"k8s.io/apimachinery/pkg/util/wait"
)

type WorkSource[C proto.Message] interface {
	ID() string
	Configuration() C
}

type WorkerFactory[C proto.Message] interface {
	New(agentId int64, source WorkSource[C]) Worker
	SourcesFromConfiguration(*agentcfg.AgentConfiguration) []WorkSource[C]
}

type Worker interface {
	Run(context.Context)
}

type WorkerManager[C proto.Message] struct {
	log           *zap.Logger
	workerFactory WorkerFactory[C]
	workers       map[string]*workerHolder[C] // source id -> worker holder instance
}

func NewWorkerManager[C proto.Message](log *zap.Logger, workerFactory WorkerFactory[C]) *WorkerManager[C] {
	return &WorkerManager[C]{
		log:           log,
		workerFactory: workerFactory,
		workers:       map[string]*workerHolder[C]{},
	}
}

func (m *WorkerManager[C]) startNewWorker(agentId int64, source WorkSource[C]) {
	id := source.ID()
	m.log.Info("Starting worker", logz.WorkerId(id))
	worker := m.workerFactory.New(agentId, source)
	ctx, cancel := context.WithCancel(context.Background())
	holder := &workerHolder[C]{
		sourceId: id,
		config:   source.Configuration(),
		stop:     cancel,
	}
	holder.wg.StartWithContext(ctx, worker.Run)
	m.workers[id] = holder
}

func (m *WorkerManager[C]) ApplyConfiguration(agentId int64, cfg *agentcfg.AgentConfiguration) error {
	sources := m.workerFactory.SourcesFromConfiguration(cfg)
	newSetOfSources := make(map[string]struct{}, len(sources))
	var sourcesToStartWorkersFor []WorkSource[C]
	var workersToStop []*workerHolder[C] // nolint:prealloc

	// Collect sources without workers or with updated configuration.
	for _, source := range sources {
		id := source.ID()
		if _, ok := newSetOfSources[id]; ok {
			return fmt.Errorf("duplicate source id: %s", id)
		}
		newSetOfSources[id] = struct{}{}
		holder := m.workers[id]
		if holder == nil { // New source added
			sourcesToStartWorkersFor = append(sourcesToStartWorkersFor, source)
		} else { // We have a worker for this source already
			if proto.Equal(source.Configuration(), holder.config) {
				// Worker's configuration hasn't changed, nothing to do here
				continue
			}
			m.log.Info("Configuration has been updated, restarting worker", logz.WorkerId(id))
			workersToStop = append(workersToStop, holder)
			sourcesToStartWorkersFor = append(sourcesToStartWorkersFor, source)
		}
	}

	// Stop workers for sources which have been removed from the list.
	for sourceId, holder := range m.workers {
		if _, ok := newSetOfSources[sourceId]; ok {
			continue
		}
		workersToStop = append(workersToStop, holder)
	}

	// Tell workers that should be stopped to stop.
	for _, holder := range workersToStop {
		m.log.Info("Stopping worker", logz.WorkerId(holder.sourceId))
		holder.stop()
		delete(m.workers, holder.sourceId)
	}

	// Wait for stopped workers to finish.
	for _, holder := range workersToStop {
		m.log.Info("Waiting for worker to stop", logz.WorkerId(holder.sourceId))
		holder.wg.Wait()
		m.log.Info("Stopped worker", logz.WorkerId(holder.sourceId))
	}

	// Start new workers for new sources or because of updated configuration.
	for _, source := range sourcesToStartWorkersFor {
		m.startNewWorker(agentId, source) // nolint: contextcheck
	}
	return nil
}

func (m *WorkerManager[C]) StopAllWorkers() {
	// Tell all workers to stop
	for _, holder := range m.workers {
		m.log.Info("Stopping worker", logz.WorkerId(holder.sourceId))
		holder.stop()
	}
	// Wait for all workers to stop
	for k, holder := range m.workers {
		m.log.Info("Waiting for worker to stop", logz.WorkerId(holder.sourceId))
		holder.wg.Wait()
		// we clear the workers map to allow for a proper restart of the workers.
		delete(m.workers, k)
		m.log.Info("Stopped worker", logz.WorkerId(holder.sourceId))
	}
}

type workerHolder[C proto.Message] struct {
	sourceId string
	config   C
	wg       wait.Group
	stop     context.CancelFunc
}
