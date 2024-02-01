package v1alpha1

import (
	console "github.com/pluralsh/console-client-go"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&ScmConnection{}, &ScmConnectionList{})
}

// ScmConnectionList ...
// +kubebuilder:object:root=true
type ScmConnectionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ScmConnection `json:"items"`
}

// ScmConnection ...
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the scm connection in the Console API."
// +kubebuilder:printcolumn:name="Provider",type="string",JSONPath=".spec.type",description="Name of the scm provider service."
type ScmConnection struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// +kubebuilder:validation:Required
	Spec ScmConnectionSpec `json:"spec"`
	// +kubebuilder:validation:Optional
	Status ScmConnectionStatus `json:"status,omitempty"`
}

func (s *ScmConnection) ConsoleName() string {
	return s.Spec.Name
}

func (s *ScmConnection) Attributes(token string) console.ScmConnectionAttributes {
	return console.ScmConnectionAttributes{
		Name:     s.Spec.Name,
		Type:     s.Spec.Type,
		Username: s.Spec.Username,
		BaseURL:  s.Spec.BaseUrl,
		APIURL:   s.Spec.APIUrl,
		Token:    &token,
	}
}

func (s *ScmConnection) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(s.Spec)
	if err != nil {
		return false, "", err
	}

	return !s.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (p *ScmConnection) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&p.Status.Conditions, condition)
}

type ScmConnectionSpec struct {
	// Name is a human-readable name of the ScmConnection.
	// +kubebuilder:validation:Required
	Name string `json:"name"`
	// Type is the name of the scm service for the ScmConnection.
	// One of (ScmType): [github, gitlab]
	// +kubebuilder:example:=GITHUB
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=GITHUB;GITLAB
	Type console.ScmType `json:"type"`
	// Token ...
	// +kubebuilder:validation:Required
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef"`
	// Username ...
	// +kubebuilder:validation:Optional
	Username *string `json:"username,omitempty"`
	// BaseUrl is a base URL for Git clones for self-hosted versions.
	// +kubebuilder:validation:Optional
	BaseUrl *string `json:"baseUrl,omitempty"`
	// APIUrl is a base URL for HTTP apis for shel-hosted versions if different from BaseUrl.
	// +kubebuilder:validation:Optional
	APIUrl *string `json:"apiUrl,omitempty"`
}

type ScmConnectionStatus struct {
	// ID of the Scm connection in the Console API.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	ID *string `json:"id,omitempty"`
	// SHA of last applied configuration.
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Type:=string
	SHA *string `json:"sha,omitempty"`
	// Represents the observations of a ScmConnection's current state.
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
}

func (p *ScmConnectionStatus) GetID() string {
	if !p.HasID() {
		return ""
	}

	return *p.ID
}

func (p *ScmConnectionStatus) HasID() bool {
	return p.ID != nil && len(*p.ID) > 0
}

func (p *ScmConnectionStatus) GetSHA() string {
	if !p.HasSHA() {
		return ""
	}

	return *p.SHA
}

func (p *ScmConnectionStatus) HasSHA() bool {
	return p.SHA != nil && len(*p.SHA) > 0
}

func (p *ScmConnectionStatus) IsSHAEqual(sha string) bool {
	if !p.HasSHA() {
		return false
	}

	return p.GetSHA() == sha
}

func (p *ScmConnectionStatus) HasReadonlyCondition() bool {
	return meta.FindStatusCondition(p.Conditions, ReadonlyConditionType.String()) != nil
}

func (p *ScmConnectionStatus) IsReadonly() bool {
	return meta.IsStatusConditionTrue(p.Conditions, ReadonlyConditionType.String())
}
