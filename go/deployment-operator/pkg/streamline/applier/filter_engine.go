package applier

import (
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type Filter string

type FilterFunc func(obj unstructured.Unstructured) bool

// FilterEngine holds a list of filters
type FilterEngine struct {
	filters map[Filter]FilterFunc
}

// Add adds a new filter
func (fe *FilterEngine) Add(name Filter, f FilterFunc) {
	fe.filters[name] = f
}

// Match runs all filters and returns true only if all pass
func (fe *FilterEngine) Match(obj unstructured.Unstructured) bool {
	for _, f := range fe.filters {
		if !f(obj) {
			return false
		}
	}
	return true
}

// MatchOmit runs all filters except the ones in skip and returns true only if all pass
func (fe *FilterEngine) MatchOmit(obj unstructured.Unstructured, omit ...Filter) bool {
	for name, f := range fe.filters {
		if lo.Contains(omit, name) {
			continue
		}

		if !f(obj) {
			return false
		}
	}

	return true
}

func NewFilterEngine() *FilterEngine {
	return &FilterEngine{
		filters: make(map[Filter]FilterFunc),
	}
}
