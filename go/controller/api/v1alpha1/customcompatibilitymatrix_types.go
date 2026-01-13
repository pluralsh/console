package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CustomCompatibilityMatrixSpec defines the desired state of CustomCompatibilityMatrix
type CustomCompatibilityMatrixSpec struct {
	// Name of this CustomCompatibilityMatrixSpec. If not provided CustomCompatibilityMatrixSpec's own name from CustomCompatibilityMatrixSpec.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Icon the icon to use for this matrix
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// GitURL the git url to use for this matrix
	// +kubebuilder:validation:Optional
	GitURL *string `json:"gitUrl,omitempty"`

	// ReleaseURL the release url to use for this matrix
	// +kubebuilder:validation:Optional
	ReleaseURL *string `json:"releaseUrl,omitempty"`

	// ReadmeURL the readme url to use for this matrix
	// +kubebuilder:validation:Optional
	ReadmeURL *string `json:"readmeUrl,omitempty"`

	// Versions the versions for this matrix
	// +kubebuilder:validation:Optional
	Versions []*CompatibilityMatrixVersion `json:"versions,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

type CompatibilityMatrixVersion struct {
	// Version the version of the matrix
	Version string `json:"version"`
	// ChartVersion the chart version of the matrix
	// +kubebuilder:validation:Optional
	ChartVersion *string `json:"chartVersion,omitempty"`
	// Kube the kube version of the matrix
	// +kubebuilder:validation:Optional
	Kube []string `json:"kube,omitempty"`
	// Summary the summary for this version
	// +kubebuilder:validation:Optional
	Summary *CompatibilityMatrixSummary `json:"summary,omitempty"`
}

type CompatibilityMatrixSummary struct {
	// HelmChanges the helm changes for this version
	// +kubebuilder:validation:Optional
	HelmChanges []string `json:"helmChanges,omitempty"`
	// BreakingChanges the breaking changes for this version
	// +kubebuilder:validation:Optional
	BreakingChanges []string `json:"breakingChanges,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="CustomCompatibilityMatrix ID"

// CustomCompatibilityMatrix is the Schema for the customcompatibilitymatrices API
type CustomCompatibilityMatrix struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CustomCompatibilityMatrixSpec `json:"spec,omitempty"`
	Status Status                        `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// CustomCompatibilityMatrixList contains a list of CustomCompatibilityMatrix
type CustomCompatibilityMatrixList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CustomCompatibilityMatrix `json:"items"`
}

func init() {
	SchemeBuilder.Register(&CustomCompatibilityMatrix{}, &CustomCompatibilityMatrixList{})
}

func (p *CustomCompatibilityMatrix) ConsoleName() string {
	if p.Spec.Name != nil && len(*p.Spec.Name) > 0 {
		return *p.Spec.Name
	}

	return p.Name
}

func (p *CustomCompatibilityMatrix) Attributes() console.CustomCompatibilityMatrixAttributes {
	ccm := console.CustomCompatibilityMatrixAttributes{
		Name:       p.ConsoleName(),
		Icon:       p.Spec.Icon,
		GitURL:     p.Spec.GitURL,
		ReleaseURL: p.Spec.ReleaseURL,
		ReadmeURL:  p.Spec.ReadmeURL,
	}
	if len(p.Spec.Versions) > 0 {
		ccm.Versions = make([]*console.CompatibilityMatrixVersionAttributes, 0)
		for _, v := range p.Spec.Versions {
			va := &console.CompatibilityMatrixVersionAttributes{
				Version:      v.Version,
				ChartVersion: v.ChartVersion,
				Kube:         v.Kube,
			}
			if v.Summary != nil {
				va.Summary = &console.CompatibilityMatrixSummaryAttributes{
					HelmChanges:     v.Summary.HelmChanges,
					BreakingChanges: v.Summary.BreakingChanges,
				}
			}
			ccm.Versions = append(ccm.Versions, va)
		}
	}

	return ccm
}

func (p *CustomCompatibilityMatrix) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}
