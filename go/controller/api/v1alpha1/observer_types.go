package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// ObserverSpec defines the desired state of Observer
type ObserverSpec struct {
	// the name of this observer, if not provided Observer's own name from Observer.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	Crontab string `json:"crontab"`

	Target ObserverTarget `json:"target"`

	Actions []ObserverAction `json:"actions,omitempty"`

	// ProjectRef references project this observer belongs to.
	// If not provided, it will use the default project.
	// +kubebuilder:validation:Optional
	ProjectRef *v1.ObjectReference `json:"projectRef,omitempty"`
}

type ObserverAction struct {
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=PIPELINE;PR
	Type console.ObserverActionType `json:"type"`

	Configuration ObserverConfiguration `json:"configuration"`
}

type ObserverConfiguration struct {
	Pr       *ObserverPrAction       `json:"pr,omitempty"`
	Pipeline *ObserverPipelineAction `json:"pipeline,omitempty"`
}

type ObserverPrAction struct {
	// PrAutomationRef references to PR automation.
	// +kubebuilder:validation:Optional
	PrAutomationRef *v1.ObjectReference `json:"prAutomationRef,omitempty"`

	Repository *string `json:"repository,omitempty"`
	// BranchTemplate a template to use for the created branch, use $value to interject the observed value
	BranchTemplate *string `json:"branchTemplate,omitempty"`

	// Context is a ObserverPrAction context
	Context runtime.RawExtension `json:"context,omitempty"`
}

type ObserverPipelineAction struct {
	// PipelineRef references to Pipeline.
	// +kubebuilder:validation:Optional
	PipelineRef *v1.ObjectReference `json:"pipelineRef,omitempty"`

	Context runtime.RawExtension `json:"context,omitempty"`
}

type ObserverTarget struct {
	// +kubebuilder:validation:Optional
	Helm *ObserverHelm `json:"helm"`
	// +kubebuilder:validation:Optional
	OCI *ObserverOci `json:"oci"`
}

type ObserverHelm struct {
	// URL of the Helm repository.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Chart of the Helm repository.
	// +kubebuilder:validation:Required
	Chart string `json:"chart"`

	// Provider is the name of the Helm auth provider.
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains authentication credentials for the Helm repository.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

type ObserverOci struct {
	// URL of the Helm repository.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="URL is immutable"
	URL string `json:"url"`

	// Provider is the name of the Helm auth provider.
	// +kubebuilder:example:=AWS
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=BASIC;BEARER;GCP;AZURE;AWS
	Provider *console.HelmAuthProvider `json:"provider,omitempty"`

	// Auth contains authentication credentials for the Helm repository.
	// +kubebuilder:validation:Optional
	Auth *HelmRepositoryAuth `json:"auth,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the observer in the Console API."

// Observer is the Schema for the observers API
type Observer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ObserverSpec `json:"spec,omitempty"`
	Status Status       `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// ObserverList contains a list of Observer
type ObserverList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Observer `json:"items"`
}

func (o *Observer) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&o.Status.Conditions, condition)
}

// ObserverName implements NamespacedPluralResource interface
func (o *Observer) ObserverName() string {
	if o.Spec.Name != nil && len(*o.Spec.Name) > 0 {
		return *o.Spec.Name
	}

	return o.Name
}

func init() {
	SchemeBuilder.Register(&Observer{}, &ObserverList{})
}
