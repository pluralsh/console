package v1alpha1

import (
	console "github.com/pluralsh/console-client-go"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// NamespacedName is the same as types.NamespacedName
// with the addition of kubebuilder/json annotations for better schema support.
type NamespacedName struct {
	// Name is a resource name.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Namespace is a resource namespace.
	// +kubebuilder:validation:Required
	Namespace string `json:"namespace"`
}

// Bindings ...
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

type ConditionType string

func (c ConditionType) String() string {
	return string(c)
}

const (
	ReadonlyConditionType     ConditionType = "Readonly"
	ReadyConditionType        ConditionType = "Ready"
	SynchronizedConditionType ConditionType = "Synchronized"
)

type ConditionReason string

func (c ConditionReason) String() string {
	return string(c)
}

const (
	ReadonlyConditionReason             ConditionReason = "Readonly"
	ReadyConditionReason                ConditionReason = "Ready"
	ReadyConditionReasonDeleting        ConditionReason = "Deleting"
	SynchronizedConditionReason         ConditionReason = "Synchronized"
	SynchronizedConditionReasonError    ConditionReason = "Error"
	SynchronizedConditionReasonNotFound ConditionReason = "NotFound"
	SynchronizedConditionReasonDeleting ConditionReason = "Deleting"
)

type ConditionMessage string

func (c ConditionMessage) String() string {
	return string(c)
}

const (
	ReadonlyTrueConditionMessage ConditionMessage = "Running in read-only mode"
)

// GitRef ...
type GitRef struct {
	// Folder ...
	// +kubebuilder:validation:Required
	Folder string `json:"folder"`

	// Ref ...
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
	}
}

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

func (p *Status) HasReadonlyCondition() bool {
	return meta.FindStatusCondition(p.Conditions, ReadonlyConditionType.String()) != nil
}

func (p *Status) IsReadonly() bool {
	return meta.IsStatusConditionTrue(p.Conditions, ReadonlyConditionType.String())
}

func (p *Status) IsStatusConditionTrue(condition ConditionType) bool {
	return meta.IsStatusConditionTrue(p.Conditions, condition.String())
}

// PluralResource ...
// +k8s:deepcopy-gen=false
type PluralResource interface {
	client.Object

	// ConsoleID returns a resource id read from the Console API
	ConsoleID() *string
	// ConsoleName returns a resource name read from the Console API
	ConsoleName() string
}

// NamespacedPluralResource ...
// +k8s:deepcopy-gen=false
type NamespacedPluralResource interface {
	PluralResource

	// ConsoleNamespace returns a resource namespace read from the Console API
	ConsoleNamespace() string
}
