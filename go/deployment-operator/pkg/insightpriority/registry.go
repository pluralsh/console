package insightpriority

import (
	"slices"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/event"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

// Result is the outcome of the last evaluation of a script.
type Result struct {
	Time       time.Time
	Matched    int
	Overridden int
	Ignored    int
	Duration   time.Duration
	// Err is why the script failed, its objects then keep their built-in priority.
	Err string
	// LostTo are the scripts that took objects away from this one because of their precedence.
	LostTo []types.NamespacedName
}

// changed reports whether the result differs from the previous one in anything worth a status update.
func (r Result) changed(previous Result) bool {
	return r.Matched != previous.Matched || r.Overridden != previous.Overridden || r.Ignored != previous.Ignored ||
		r.Err != previous.Err || !slices.Equal(r.LostTo, previous.LostTo)
}

// Registry holds the scripts that compiled, and the results of their evaluations.
// It is safe for concurrent use.
type Registry struct {
	mu      sync.RWMutex
	scripts map[types.NamespacedName]Script
	results map[types.NamespacedName]Result
	events  chan event.GenericEvent
}

func NewRegistry() *Registry {
	return &Registry{
		scripts: make(map[types.NamespacedName]Script),
		results: make(map[types.NamespacedName]Result),
		events:  make(chan event.GenericEvent, 128),
	}
}

// Events emits the scripts whose result changed, to be reconciled so their status follows.
func (r *Registry) Events() <-chan event.GenericEvent {
	return r.events
}

// Set registers a script, replacing the one with the same key. The result of a previous version of the script is dropped.
func (r *Registry) Set(script Script) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if previous, ok := r.scripts[script.Key]; ok && previous.Generation != script.Generation {
		delete(r.results, script.Key)
	}
	r.scripts[script.Key] = script
}

// Remove forgets a script and its result.
func (r *Registry) Remove(key types.NamespacedName) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.scripts, key)
	delete(r.results, key)
}

// Scripts returns the registered scripts, the ones that own contested objects first.
func (r *Registry) Scripts() []Script {
	r.mu.RLock()
	scripts := make([]Script, 0, len(r.scripts))
	for _, s := range r.scripts {
		scripts = append(scripts, s)
	}
	r.mu.RUnlock()

	slices.SortFunc(scripts, func(a, b Script) int {
		switch {
		case before(a, b):
			return -1
		case before(b, a):
			return 1
		default:
			return 0
		}
	})
	return scripts
}

// Result returns the result of the last evaluation of a script.
func (r *Registry) Result(key types.NamespacedName) (Result, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result, ok := r.results[key]
	return result, ok
}

// record stores the results of an evaluation round and tells the controller about the ones that changed.
func (r *Registry) record(results map[types.NamespacedName]Result) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for key, result := range results {
		if _, registered := r.scripts[key]; !registered {
			continue
		}

		previous, seen := r.results[key]
		if seen && !result.changed(previous) {
			result.Time = previous.Time
			r.results[key] = result
			continue
		}

		r.results[key] = result
		select {
		case r.events <- event.GenericEvent{Object: &v1alpha1.CustomInsightPriority{
			ObjectMeta: metav1.ObjectMeta{Namespace: key.Namespace, Name: key.Name},
		}}:
		default: // the controller is behind, it reads the latest result from the registry anyway
		}
	}
}
