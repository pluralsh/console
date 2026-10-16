package insights

import (
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	// AnnotationPriority pins the insight priority of an object. IGNORE removes it from insights and the health score.
	AnnotationPriority = "deployments.plural.sh/insight-priority"

	// Ignore is the annotation value that excludes an object.
	Ignore = "IGNORE"
)

const (
	kindDeployment  = "Deployment"
	kindStatefulSet = "StatefulSet"
	kindDaemonSet   = "DaemonSet"
)

var annotationValues = map[string]struct{}{"LOW": {}, "MEDIUM": {}, "HIGH": {}, "CRITICAL": {}, Ignore: {}}

// Criticality is how important a component is to the cluster, independent of how badly it is failing.
type Criticality struct {
	Score  int
	Reason string
}

// Classify scores the criticality of a component. The first source that applies wins:
// system-* priority class, catalog, system namespace tier, kind default.
func Classify(kind, namespace, name, priorityClass string) Criticality {
	if strings.HasPrefix(priorityClass, "system-") {
		return Criticality{Score: ScoreCore, Reason: "priority class " + priorityClass}
	}

	if isWorkload(kind) {
		if _, hit, ok := longestRun(name, catalogIndex); ok {
			return Criticality{Score: hit.score, Reason: "catalog: " + hit.entry}
		}
	}

	if _, score, ok := longestRun(namespace, namespaceTiers); ok {
		return Criticality{Score: score, Reason: "namespace: " + namespace}
	}

	if score, ok := kindScores[kind]; ok {
		return Criticality{Score: score, Reason: "kind default: " + kind}
	}
	return Criticality{Score: ScoreLow, Reason: "default"}
}

func isWorkload(kind string) bool {
	switch kind {
	case kindDeployment, kindStatefulSet, kindDaemonSet:
		return true
	}
	return false
}

// IsRootKind reports whether objects of the kind can stand for a failure of the objects they own.
func IsRootKind(kind string) bool {
	switch kind {
	case kindDeployment, kindStatefulSet, kindDaemonSet, "Ingress", "Certificate", "CronJob":
		return true
	}
	return false
}

// Facts are the insight related attributes derived from an object at write time.
type Facts struct {
	Criticality        int
	CriticalityReason  string
	PriorityClass      string
	PriorityAnnotation string
	DesiredReplicas    *int64
	ReadyReplicas      *int64
	HealthMessage      string
	// FailingSince is a unix time, zero when the object is not failing.
	FailingSince int64
	// LastSuccessfulTime is the unix time of the last successful run of a CronJob, zero when it has none or the
	// object is not a CronJob. A retained failed job that is older than it is not a failure of the CronJob.
	LastSuccessfulTime int64
}

// Extract derives Facts from an object. Criticality is only classified for root kinds and objects that
// are not running, as only those can end up reported. A failing object takes its failing time from
// its conditions when they carry one, and from now otherwise.
func Extract(obj *unstructured.Unstructured, running, failed bool, message string, now time.Time) Facts {
	kind := obj.GetKind()
	facts := Facts{}

	if failed {
		facts.FailingSince = failingSince(obj, now)
		facts.HealthMessage = message
	}

	// Any object can end up as the root of a failure, so the annotation is always kept.
	facts.PriorityAnnotation = annotation(obj)
	if running && !IsRootKind(kind) {
		if kind != "Pod" { // pods can not own other objects, the others might end up as the root of a failure
			facts.PriorityClass = priorityClass(obj)
		}
		return facts
	}

	facts.PriorityClass = priorityClass(obj)
	facts.DesiredReplicas, facts.ReadyReplicas = replicas(obj)
	facts.LastSuccessfulTime = lastSuccessfulTime(obj)

	c := Classify(kind, obj.GetNamespace(), obj.GetName(), facts.PriorityClass)
	facts.Criticality, facts.CriticalityReason = c.Score, c.Reason
	return facts
}

// Annotation returns the normalized insight priority annotation of an object, or an empty string.
func Annotation(obj *unstructured.Unstructured) string {
	return annotation(obj)
}

func annotation(obj *unstructured.Unstructured) string {
	// GetAnnotations copies the whole map, and this runs for every object that is written
	raw, _, _ := unstructured.NestedString(obj.Object, "metadata", "annotations", AnnotationPriority)
	value := strings.ToUpper(strings.TrimSpace(raw))
	if _, ok := annotationValues[value]; !ok {
		return ""
	}
	return value
}

var priorityClassPaths = [][]string{
	{"spec", "template", "spec", "priorityClassName"},
	{"spec", "jobTemplate", "spec", "template", "spec", "priorityClassName"},
	{"spec", "priorityClassName"},
}

func priorityClass(obj *unstructured.Unstructured) string {
	for _, path := range priorityClassPaths {
		if v, found, _ := unstructured.NestedString(obj.Object, path...); found && v != "" {
			return v
		}
	}
	return ""
}

// lastSuccessfulTime returns the unix time of the last successful run of a CronJob, zero when unknown.
func lastSuccessfulTime(obj *unstructured.Unstructured) int64 {
	if obj.GetKind() != "CronJob" {
		return 0
	}
	raw, _, _ := unstructured.NestedString(obj.Object, "status", "lastSuccessfulTime")
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return 0
	}
	return t.Unix()
}

// replicas returns the desired and ready replica counts of workloads, nil when unknown.
func replicas(obj *unstructured.Unstructured) (desired, ready *int64) {
	switch obj.GetKind() {
	case kindDeployment, kindStatefulSet:
		d := int64(1) // the API default
		if v, found, _ := unstructured.NestedInt64(obj.Object, "spec", "replicas"); found {
			d = v
		}
		r, _, _ := unstructured.NestedInt64(obj.Object, "status", "readyReplicas")
		return new(d), new(r)
	case kindDaemonSet:
		d, found, _ := unstructured.NestedInt64(obj.Object, "status", "desiredNumberScheduled")
		if !found {
			return nil, nil
		}
		r, _, _ := unstructured.NestedInt64(obj.Object, "status", "numberReady")
		return new(d), new(r)
	}
	return nil, nil
}

// failingConditions are the condition types which, with the matching status, mean the object is not working.
var failingConditions = map[string]string{
	"Ready":       "False",
	"Available":   "False",
	"Progressing": "False",
	"Failed":      "True",
	"Degraded":    "True",
	"Stalled":     "True",
}

func failingSince(obj *unstructured.Unstructured, now time.Time) int64 {
	conditions, _, _ := unstructured.NestedSlice(obj.Object, "status", "conditions")
	var earliest time.Time
	for _, c := range conditions {
		cond, ok := c.(map[string]any)
		if !ok {
			continue
		}
		condType, _ := cond["type"].(string)
		status, _ := cond["status"].(string)
		if want, ok := failingConditions[condType]; !ok || want != status {
			continue
		}
		raw, _ := cond["lastTransitionTime"].(string)
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil || t.After(now) {
			continue
		}
		if earliest.IsZero() || t.Before(earliest) {
			earliest = t
		}
	}
	if earliest.IsZero() {
		return now.Unix()
	}
	return earliest.Unix()
}
