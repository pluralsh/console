package common

// Bindings represents policy bindings that
// can be used to define read/write permissions
// to this resource for users/groups in the system.
type Bindings struct {
	// Read bindings.
	// +kubebuilder:validation:Optional
	Read []Binding `json:"read,omitempty"`

	// Write bindings.
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`
}

// Binding represents a policy binding.
type Binding struct {
	// +kubebuilder:validation:Optional
	ID *string `json:"id,omitempty"`

	// +kubebuilder:validation:Optional
	UserID *string `json:"UserID,omitempty"`

	// +kubebuilder:validation:Optional
	UserEmail *string `json:"userEmail,omitempty"`

	// +kubebuilder:validation:Optional
	GroupID *string `json:"groupID,omitempty"`

	// +kubebuilder:validation:Optional
	GroupName *string `json:"groupName,omitempty"`
}
