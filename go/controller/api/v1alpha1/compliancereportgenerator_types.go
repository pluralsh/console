package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&ComplianceReportGenerator{}, &ComplianceReportGeneratorList{})
}

// +kubebuilder:object:root=true

type ComplianceReportGeneratorList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ComplianceReportGenerator `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Namespaced
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="Compliance Report Generator ID"

type ComplianceReportGenerator struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec              ComplianceReportGeneratorSpec `json:"spec,omitempty"`
	Status            Status                        `json:"status,omitempty"`
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

func (in *ComplianceReportGenerator) Attributes() console.ComplianceReportGeneratorAttributes {
	return console.ComplianceReportGeneratorAttributes{
		Name:         in.ComplianceReportGeneratorName(),
		Format:       in.Spec.Format,
		ReadBindings: PolicyBindings(in.Spec.ReadBindings),
	}
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
}
