package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// UpgradePlanCalloutSpec defines the desired state of UpgradePlanCallout
type UpgradePlanCalloutSpec struct {
	// Name of this UpgradePlanCallout. If not provided UpgradePlanCallout's own name from UpgradePlanCallout.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Callouts the callouts for this instance
	Callouts []UpgradePlanCalloutCallout `json:"callouts,omitempty"`

	// Context is a raw extension containing the context for this callout
	// +kubebuilder:validation:Optional
	Context runtime.RawExtension `json:"context,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// UpgradePlanCalloutCallout a callout for a specific addon in the upgrade plan
type UpgradePlanCalloutCallout struct {
	// Addon the addon this callout applies to
	Addon string `json:"addon"`
	// Template the template to use for this callout
	Template string `json:"template"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// UpgradePlanCallout is the Schema for the upgradeplancallouts API
type UpgradePlanCallout struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   UpgradePlanCalloutSpec `json:"spec,omitempty"`
	Status Status                 `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// UpgradePlanCalloutList contains a list of UpgradePlanCallout
type UpgradePlanCalloutList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []UpgradePlanCallout `json:"items"`
}

func init() {
	SchemeBuilder.Register(&UpgradePlanCallout{}, &UpgradePlanCalloutList{})
}

func (p *UpgradePlanCallout) ConsoleName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *UpgradePlanCallout) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

func (p *UpgradePlanCallout) Attributes() console.UpgradePlanCalloutAttributes {
	apc := console.UpgradePlanCalloutAttributes{
		Name: p.ConsoleName(),
	}
	if len(p.Spec.Callouts) > 0 {
		apc.Callouts = make([]*console.UpgradePlanCalloutCalloutAttributes, 0)
		for _, c := range p.Spec.Callouts {
			apc.Callouts = append(apc.Callouts, &console.UpgradePlanCalloutCalloutAttributes{
				Addon:    c.Addon,
				Template: c.Template,
			})
		}
	}
	if p.Spec.Context.Raw != nil {
		apc.Context = lo.ToPtr(string(p.Spec.Context.Raw))
	}

	return apc
}
