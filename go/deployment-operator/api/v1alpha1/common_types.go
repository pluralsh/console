package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ConditionType string

func (c ConditionType) String() string {
	return string(c)
}

const (
	ReadonlyConditionType       ConditionType = "Readonly"
	ReadyConditionType          ConditionType = "Ready"
	SynchronizedConditionType   ConditionType = "Synchronized"
	VirtualClusterConditionType ConditionType = "VirtualCluster"
	AgentConditionType          ConditionType = "Agent"
)

type ConditionReason string

func (c ConditionReason) String() string {
	return string(c)
}

const (
	ReadyConditionReason             ConditionReason = "Ready"
	ReadyConditionReasonError        ConditionReason = "Error"
	ErrorConditionReason             ConditionReason = "Error"
	SynchronizedConditionReason      ConditionReason = "Synchronized"
	SynchronizedConditionReasonError ConditionReason = "Error"
)

type ConditionMessage string

func (c ConditionMessage) String() string {
	return string(c)
}

// Hasher
// +kubebuilder:object:generate:=false
type Hasher func(interface{}) (string, error)

type Status struct {
	// ID of the resource in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`
	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`
	// Represents the observations of a PrAutomation's current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (p *Status) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *Status) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}

func (p *Status) GetSHA() string {
	if !p.HasSHA() {
		return ""
	}

	return *p.SHA
}

func (p *Status) HasSHA() bool {
	return p.SHA != nil && len(*p.SHA) > 0
}

func (p *Status) IsSHAEqual(sha string) bool {
	if !p.HasSHA() {
		return false
	}

	return p.GetSHA() == sha
}

func (p *Status) IsStatusConditionTrue(condition ConditionType) bool {
	return meta.IsStatusConditionTrue(p.Conditions, condition.String())
}

// Bindings represents a policy bindings that
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

// Binding ...
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

func PolicyBindings(bindings []Binding) []*console.PolicyBindingAttributes {
	if bindings == nil {
		return nil
	}

	filtered := algorithms.Filter(bindings, func(b Binding) bool {
		return b.UserID != nil || b.GroupID != nil
	})

	return algorithms.Map(filtered, func(b Binding) *console.PolicyBindingAttributes {
		return b.Attributes()
	})
}
