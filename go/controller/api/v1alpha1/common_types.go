package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	console "github.com/pluralsh/console/go/client"
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

// Reconciliation parameters for a specific resource.
type Reconciliation struct {
	// DriftDetection enables drift detection for this resource.
	// Use with Interval to set how often drift detection runs.
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	// +kubebuilder:example:=false
	DriftDetection *bool `json:"driftDetection,omitempty"`

	// Interval for DriftDetection mechanism.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:default="30m"
	// +kubebuilder:example:="5m"
	Interval *string `json:"interval,omitempty"`
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
	ReadonlyConditionType              ConditionType = "Readonly"
	ReadyConditionType                 ConditionType = "Ready"
	ReadyTokenConditionType            ConditionType = "ReadyToken"
	SynchronizedConditionType          ConditionType = "Synchronized"
	NamespacedCredentialsConditionType ConditionType = "NamespacedCredentials"
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
	ReadyTokenConditionReason           ConditionReason = "Ready"
	ReadyTokenConditionReasonError      ConditionReason = "Error"
	NamespacedCredentialsReason         ConditionReason = "NamespacedCredentials"
	NamespacedCredentialsReasonDefault  ConditionReason = "DefaultCredentials"
)

type ConditionMessage string

func (c ConditionMessage) String() string {
	return string(c)
}

const (
	ReadonlyTrueConditionMessage          ConditionMessage = "Running in read-only mode"
	SynchronizedNotFoundConditionMessage  ConditionMessage = "Could not find resource in Console API"
	NamespacedCredentialsConditionMessage ConditionMessage = "Using default credentials"
)

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

// PluralResource represents a resource that can be managed in plural form.
// +k8s:deepcopy-gen=false
type PluralResource interface {
	client.Object

	// ConsoleID returns a resource id read from the Console API
	ConsoleID() *string
	// ConsoleName returns a resource name read from the Console API
	ConsoleName() string
}

// NamespacedPluralResource represents a resource that can be managed in plural form.
// +k8s:deepcopy-gen=false
type NamespacedPluralResource interface {
	PluralResource

	// ConsoleNamespace returns a resource namespace read from the Console API
	ConsoleNamespace() string
}

// ObjectKeyReference is a reference to an object in a specific namespace.
// It is used to reference objects like secrets, configmaps, etc.
type ObjectKeyReference struct {
	// Name is unique within a namespace to reference a resource.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Namespace defines the space within which the resource name must be unique.
	// +kubebuilder:validation:Required
	Namespace string `json:"namespace"`

	// Key is the key of the object to use.
	// +kubebuilder:validation:Required
	Key string `json:"key"`
}
