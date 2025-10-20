package common

import console "github.com/pluralsh/console/go/client"

// GitRef represents a reference to a Git repository.
type GitRef struct {
	// Folder is the folder in the Git repository where the manifests are located.
	// +kubebuilder:validation:Required
	Folder string `json:"folder"`

	// Ref is the Git reference (branch, tag, or commit) to use.
	// +kubebuilder:validation:Required
	Ref string `json:"ref"`

	// Optional files to add to the manifests for this service
	// +kubebuilder:validation:Optional
	Files []string `json:"files,omitempty"`
}

func (in *GitRef) Attributes() *console.GitRefAttributes {
	if in == nil {
		return nil
	}

	return &console.GitRefAttributes{
		Ref:    in.Ref,
		Folder: in.Folder,
		Files:  in.Files,
	}
}
