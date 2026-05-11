package common

import "github.com/pluralsh/console/go/polly/containers"

const (
	// LifecycleDeleteAnnotation is the lifecycle annotation key for a deletion operation.
	// Keep it the same as cli-utils for backwards compatibility.
	LifecycleDeleteAnnotation = "client.lifecycle.config.k8s.io/deletion"

	// PreventDeletion is the value used with LifecycleDeletionAnnotation
	// to prevent deleting a resource. Keep it the same as cli-utils
	// for backwards compatibility.
	PreventDeletion = "detach"

	// ClientFieldManager is a name associated with the actor or entity
	// that is making changes to the object. Keep it the same as cli-utils
	// for backwards compatibility.
	ClientFieldManager = "application/apply-patch"
)

var (
	GroupBlacklist = containers.ToSet([]string{
		"aquasecurity.github.io", // Related to compliance/vulnerability reports. Can cause performance issues.
		"status.gatekeeper.sh",
	})

	ResourceVersionBlacklist = containers.ToSet([]string{
		"componentstatuses/v1",         // throwing warnings about deprecation since 1.19
		"events/v1",                    // no need to watch for resource that are not created by the user
		"bindings/v1",                  // it's not possible to watch bindings
		"localsubjectaccessreviews/v1", // it's not possible to watch localsubjectaccessreviews
		"selfsubjectreviews/v1",        // it's not possible to watch selfsubjectreviews
		"selfsubjectaccessreviews/v1",  // it's not possible to watch selfsubjectaccessreviews
		"selfsubjectrulesreviews/v1",   // it's not possible to watch selfsubjectrulesreviews
		"tokenreviews/v1",              // it's not possible to watch tokenreviews
		"subjectaccessreviews/v1",      // it's not possible to watch subjectaccessreviews
		"metrics.k8s.io/v1beta1",       // it's not possible to watch metrics
	})

	OptionalResourceVersionList = containers.ToSet([]string{
		"leases/v1", // will be watched dynamically if applier tries to create it
	})
)
