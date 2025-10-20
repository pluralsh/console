package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ComplianceReportGenerator{}, &ComplianceReportGeneratorList{})
}

// +kubebuilder:object:root=true

// ComplianceReportGeneratorList contains a list of ComplianceReportGenerator resources.
type ComplianceReportGeneratorList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ComplianceReportGenerator `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="Compliance Report Generator ID"

// ComplianceReportGenerator represents a resource that generates compliance reports.
type ComplianceReportGenerator struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ComplianceReportGeneratorSpec `json:"spec,omitempty"`
	Status Status                        `json:"status,omitempty"`
}

func (in *ComplianceReportGenerator) ComplianceReportGeneratorName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *ComplianceReportGenerator) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

func (in *ComplianceReportGenerator) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

// ComplianceReportGeneratorSpec defines the desired state of the resource.
type ComplianceReportGeneratorSpec struct {
	// Name, if not provided name from object meta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Format of the report to be generated.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=CSV;JSON
	Format console.ComplianceReportFormat `json:"format,omitempty"`

	// ReadBindings represent the download policy for this report.
	// +kubebuilder:validation:Optional
	ReadBindings []Binding `json:"readBindings,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}
