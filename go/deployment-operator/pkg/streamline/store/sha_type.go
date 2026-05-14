package store

type SHAType string

const (
	// ManifestSHA is SHA of the resource manifest from the repository.
	// It is used to detect changes in the manifest that are not yet applied.
	ManifestSHA SHAType = "MANIFEST"

	// ApplySHA is SHA of the resource post-server-side apply.
	// Taking only metadata w/ name, namespace, annotations and labels and non-status non-metadata fields.
	ApplySHA SHAType = "APPLY"

	// ServerSHA is SHA from a watch of the resource, using the same pruning function as applySHA.
	// It is persisted only if there's a current-inventory annotation.
	ServerSHA SHAType = "SERVER"

	// TransientManifestSHA is a temporary SHA of the resource manifest from the repository.
	// It is saved by the filters and committed after the resource is applied.
	TransientManifestSHA SHAType = "TRANSIENT"
)
