package v1alpha1

import (
	console "github.com/pluralsh/console-client-go"
)

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
	// +kubebuilder:validation:Optional
	ID *string `json:"id,omitempty"`

	// +kubebuilder:validation:Optional
	UserID *string `json:"UserID,omitempty"`

	// +kubebuilder:validation:Optional
	GroupID *string `json:"groupID,omitempty"`
}

func (b *Binding) Attributes() *console.PolicyBindingAttributes {
	if b == nil {
		return nil
	}

	return &console.PolicyBindingAttributes{
		ID:      b.ID,
		UserID:  b.UserID,
		GroupID: b.GroupID,
	}
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

func (t *Taint) Attributes() *console.TaintAttributes {
	return &console.TaintAttributes{
		Key:    t.Key,
		Value:  t.Value,
		Effect: string(t.Effect),
	}
}

// TaintEffect is the effect for a Kubernetes taint.
type TaintEffect string
