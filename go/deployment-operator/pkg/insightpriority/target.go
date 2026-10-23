package insightpriority

import (
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/insights"
)

// Script is a validated CustomInsightPriority.
type Script struct {
	Key        types.NamespacedName
	Precedence int
	Source     string
	// Generation of the CustomInsightPriority, a result of an older generation is stale.
	Generation int64

	kinds      []v1alpha1.InsightTargetKind
	namespaces map[string]struct{}
	selector   labels.Selector
}

// NewScript validates the target of a CustomInsightPriority. The script itself is checked by Compile.
func NewScript(cr *v1alpha1.CustomInsightPriority) (Script, error) {
	script := Script{
		Key:        types.NamespacedName{Namespace: cr.Namespace, Name: cr.Name},
		Precedence: cr.Spec.Precedence,
		Source:     cr.Spec.Script,
		Generation: cr.Generation,
		kinds:      cr.Spec.Target.Kinds,
		namespaces: make(map[string]struct{}, len(cr.Spec.Target.Namespaces)),
	}

	for _, namespace := range cr.Spec.Target.Namespaces {
		script.namespaces[namespace] = struct{}{}
	}

	if cr.Spec.Target.LabelSelector != nil {
		selector, err := metav1.LabelSelectorAsSelector(cr.Spec.Target.LabelSelector)
		if err != nil {
			return Script{}, fmt.Errorf("invalid label selector: %w", err)
		}
		script.selector = selector
	}

	return script, nil
}

// Matches reports whether the script is responsible for the root: it has to match every field of the target that is set.
func (s Script) Matches(r insights.Root) bool {
	if len(s.kinds) > 0 && !s.matchesKind(r) {
		return false
	}

	if len(s.namespaces) > 0 {
		if _, ok := s.namespaces[r.Namespace]; !ok {
			return false
		}
	}

	return s.selector == nil || s.selector.Matches(labels.Set(r.Labels))
}

func (s Script) matchesKind(r insights.Root) bool {
	for _, k := range s.kinds {
		if k.Kind == r.Kind && k.Group == r.Group && (k.Version == "" || k.Version == r.Version) {
			return true
		}
	}
	return false
}

// before orders scripts by who owns an object several of them match: the highest precedence, then the name.
func before(a, b Script) bool {
	if a.Precedence != b.Precedence {
		return a.Precedence > b.Precedence
	}
	if a.Key.Namespace != b.Key.Namespace {
		return a.Key.Namespace < b.Key.Namespace
	}
	return a.Key.Name < b.Key.Name
}
