package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
