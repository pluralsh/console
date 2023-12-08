package v1alpha1

type NamespacedName struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
}

type Bindings struct {
	// Read bindings.
	// +kubebuilder:validation:Optional
	Read []Binding `json:"read,omitempty"`

	// Write bindings.
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`
}

type Binding struct {
	// TODO: Add docs.
	// +kubebuilder:validation:Optional
	ID *string `json:"id,omitempty"`

	// TODO: Add docs.
	// +kubebuilder:validation:Optional
	UserID *string `json:"UserID,omitempty"`

	// TODO: Add docs.
	// +kubebuilder:validation:Optional
	GroupID *string `json:"groupID,omitempty"`
}

// Taint represents a Kubernetes taint.
type Taint struct {
	// Effect specifies the effect for the taint.
	// +kubebuilder:validation:Enum=NoSchedule;NoExecute;PreferNoSchedule
	Effect TaintEffect `json:"effect"`

	// Key is the key of the taint.
	Key string `json:"key"`

	// Value is the value of the taint.
	Value string `json:"value"`
}

// TaintEffect is the effect for a Kubernetes taint.
type TaintEffect string
