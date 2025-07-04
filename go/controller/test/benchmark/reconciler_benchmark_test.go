package benchmark

import (
	"context"
	"fmt"
	"io"
	"math/rand"
	"sync"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"golang.org/x/time/rate"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"
	ctrl "sigs.k8s.io/controller-runtime"

	internaltypes "github.com/pluralsh/console/go/controller/internal/types"
)

const (
	// Default processing time for benchmarks
	processingTime = 50 * time.Millisecond
	// Default number of events to process in benchmarks
	numEvents = 1000
	// Timeout for processing in benchmarks
	processingTimeout = 3 * time.Minute
	// Disable jitter for dequeueing to ensure consistent timing in benchmarks
	dequeueJitter = 1 * time.Millisecond
)

var (
	// Different worker counts for benchmarking sharded reconcilers
	workerCounts = []int{1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024}
	// nopLogger is a no-op logger used to avoid logging during benchmarks
	nopLogger = logr.Discard()
)

func init() {
	klog.SetOutput(io.Discard)
	klog.LogToStderr(false)
	ctrl.SetLogger(nopLogger)
	printConfigurationInfo()
}

func printConfigurationInfo() {
	fmt.Println("Benchmark Configuration:")
	fmt.Printf("  Processing Time: %v\n", processingTime)
	fmt.Printf("  Number of Events: %d\n", numEvents)
	fmt.Printf("  Processing Timeout: %v\n", processingTimeout)
	fmt.Printf("  Dequeue Jitter: %v\n", dequeueJitter)
	fmt.Printf("  Worker Counts: %v\n", workerCounts)
}

// MockReconciler implements a mock reconciler that simulates processing work
type MockReconciler struct {
	ID             internaltypes.Reconciler
	queue          workqueue.TypedRateLimitingInterface[ctrl.Request]
	processingTime time.Duration // Simulated processing time
	processedItems int           // Counter for processed items
	mu             sync.Mutex    // Mutex to protect concurrent access to the counter
}

// NewMockReconciler creates a new mock reconciler with specified processing time
func NewMockReconciler(name string, processingTime time.Duration) *MockReconciler {
	return &MockReconciler{
		ID: internaltypes.Reconciler(name),
		queue: workqueue.NewTypedRateLimitingQueue(workqueue.NewTypedMaxOfRateLimiter[ctrl.Request](
			workqueue.NewTypedItemExponentialFailureRateLimiter[ctrl.Request](5*time.Millisecond, 1000*time.Second),
			&workqueue.TypedBucketRateLimiter[ctrl.Request]{Limiter: rate.NewLimiter(rate.Limit(numEvents), numEvents)},
		)),
		processingTime: processingTime,
		mu:             sync.Mutex{},
	}
}

// Queue implements the internaltypes.Processor interface
func (r *MockReconciler) Queue() workqueue.TypedRateLimitingInterface[ctrl.Request] {
	return r.queue
}

// Name implements the internaltypes.Processor interface
func (r *MockReconciler) Name() internaltypes.Reconciler {
	return r.ID
}

// Process implements the internaltypes.Processor interface
// It simulates actual processing by sleeping for the configured duration
func (r *MockReconciler) Process(_ context.Context, _ ctrl.Request) (ctrl.Result, error) {
	// Simulate processing time with some jitter
	jitter := time.Duration(rand.Int63n(int64(r.processingTime) / 5))
	time.Sleep(r.processingTime + jitter)

	// Increment the counter
	r.mu.Lock()
	r.processedItems++
	r.mu.Unlock()

	return ctrl.Result{}, nil
}

// GetProcessedItems returns the number of items processed
func (r *MockReconciler) GetProcessedItems() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.processedItems
}

// generateTestEvents generates test reconciliation events
func generateTestEvents(count int) []ctrl.Request {
	events := make([]ctrl.Request, count)
	for i := 0; i < count; i++ {
		events[i] = ctrl.Request{
			NamespacedName: types.NamespacedName{
				Namespace: fmt.Sprintf("namespace-%d", i%100),
				Name:      fmt.Sprintf("resource-%d", i/10),
			},
		}
	}
	return events
}

// waitForProcessingComplete waits until all items are processed with a timeout
func waitForProcessingComplete(reconciler *MockReconciler, expectedCount int, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if reconciler.GetProcessedItems() >= expectedCount {
			return true
		}

		time.Sleep(10 * time.Millisecond)
	}
	return false
}

func runSingleReconciler(
	logF func(format string, args ...any),
	fatalF func(format string, args ...any),
) float64 {
	reconciler := NewMockReconciler("single", processingTime)
	events := generateTestEvents(numEvents)

	ctx, cancel := context.WithCancel(context.Background())

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				item, shutdown := reconciler.queue.Get()
				if shutdown {
					return
				}

				_, _ = reconciler.Process(ctx, item)
				reconciler.queue.Done(item)
				time.Sleep(time.Duration(rand.Int63n(int64(dequeueJitter))))
			}
		}
	}()

	startTime := time.Now()
	for _, event := range events {
		reconciler.queue.Add(event)
	}

	if !waitForProcessingComplete(reconciler, numEvents, processingTimeout) {
		fatalF("Timed out waiting for processing to complete")
	}

	duration := time.Since(startTime)
	throughput := float64(numEvents) / duration.Seconds()

	logF("Single Reconciler - Processed %d events in %v, Throughput: %.2f events/sec",
		reconciler.GetProcessedItems(), duration, throughput)

	cancel()
	reconciler.queue.ShutDown()
	wg.Wait()

	return throughput
}

func runShardedReconciler(
	numWorkers int,
	logF func(format string, args ...any),
	fatalF func(format string, args ...any),
) float64 {
	reconciler := NewMockReconciler("sharded", processingTime)
	events := generateTestEvents(numEvents)

	manager := internaltypes.NewManager(
		reconciler,
		internaltypes.WithMaxConcurrentReconciles(numWorkers),
		internaltypes.WithDeQueueJitter(dequeueJitter),
	)

	ctx, cancel := context.WithCancel(context.Background())

	var managerWg sync.WaitGroup
	managerWg.Add(1)
	go func() {
		defer managerWg.Done()
		manager.Start(ctx)
	}()

	startTime := time.Now()
	for _, event := range events {
		reconciler.queue.Add(event)
	}

	if !waitForProcessingComplete(reconciler, numEvents, processingTimeout) {
		fatalF("Timed out waiting for processing to complete")
	}

	duration := time.Since(startTime)
	throughput := float64(numEvents) / duration.Seconds()

	logF("Sharded Reconciler (%d workers) - Processed %d events in %v, Throughput: %.2f events/sec",
		numWorkers, reconciler.GetProcessedItems(), duration, throughput)

	cancel()
	reconciler.queue.ShutDown()
	managerWg.Wait()

	return throughput
}

// BenchmarkSingleReconciler benchmarks a single reconciler setup
func BenchmarkSingleReconciler(b *testing.B) {
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		runSingleReconciler(b.Logf, b.Fatalf)
	}
}

// BenchmarkShardedReconciler benchmarks the types.Manager implementation with sharded reconcilers
func BenchmarkShardedReconciler(b *testing.B) {
	for _, numWorkers := range workerCounts {
		b.Run(fmt.Sprintf("Workers=%d", numWorkers), func(b *testing.B) {
			b.ResetTimer()

			for i := 0; i < b.N; i++ {
				runShardedReconciler(numWorkers, b.Logf, b.Fatalf)
			}
		})
	}
}

// TestCompareReconcilerThroughput is a test that compares the throughput of different reconciler setups
func TestCompareReconcilerThroughput(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping throughput test in short mode")
	}

	singleReconcilerResult := 0.0
	t.Run("SingleReconciler", func(t *testing.T) {
		singleReconcilerResult = runSingleReconciler(t.Logf, t.Fatalf)
	})

	shardedReconcilersResult := make([]float64, len(workerCounts))
	for i, numWorkers := range workerCounts {
		t.Run(fmt.Sprintf("ShardedReconciler-%d-Workers", numWorkers), func(t *testing.T) {
			shardedReconcilersResult[i] = runShardedReconciler(numWorkers, t.Logf, t.Fatalf)
		})
	}

	t.Log("\nThroughput Comparison:")
	t.Logf("Single Reconciler: %.2f events/sec", singleReconcilerResult)

	for i, numWorkers := range workerCounts {
		improvement := (shardedReconcilersResult[i] - singleReconcilerResult) / singleReconcilerResult * 100
		t.Logf("Sharded Reconciler (%d workers): %.2f events/sec (%.2f%% improvement)",
			numWorkers, shardedReconcilersResult[i], improvement)
	}
}
