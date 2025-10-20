package v1alpha1

import (
	"github.com/pluralsh/console/go/controller/api/common"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&ServiceAccount{}, &ServiceAccountList{})
}

// +kubebuilder:object:root=true

// ServiceAccountList contains a list of ServiceAccount resources.
type ServiceAccountList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []ServiceAccount `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the ServiceAccount in the Console API."

// ServiceAccount provides a programmatic identity for automated processes and tools to interact
// with the Plural Console API. Unlike user accounts, service accounts are designed for non-human
// authentication and can be scoped to specific APIs and resources for secure, limited access.
// This enables to authenticate and perform operations within defined permissions boundaries.
type ServiceAccount struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the ServiceAccount, including email identity
	// and scope restrictions for API access control.
	// +kubebuilder:validation:Required
	Spec ServiceAccountSpec `json:"spec"`

	// Status represents the current state of this ServiceAccount resource.
	// +kubebuilder:validation:Optional
	Status common.Status `json:"status,omitempty"`
}

// ConsoleID returns an ID used in Console API.
func (in *ServiceAccount) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName returns a name used in Console API.
func (in *ServiceAccount) ConsoleName() string {
	return in.Name
}

func (in *ServiceAccount) Attributes() console.ServiceAccountAttributes {
	attrs := console.ServiceAccountAttributes{
		Name:  lo.ToPtr(in.ConsoleName()),
		Email: &in.Spec.Email,
	}

	return attrs
}

func (in *ServiceAccount) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *ServiceAccount) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ServiceAccountSpec defines the desired state of the ServiceAccount.
type ServiceAccountSpec struct {
	// Email address that will be bound to this service account for identification
	// and authentication purposes. This email serves as the unique identifier
	// for the service account within the Console API.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:example:=some@email.com
	Email string `json:"email"`

	// Scopes define the access boundaries for this service account, controlling
	// which Console APIs and resources it can interact with. Each scope can restrict
	// access to specific API endpoints and resource identifiers, enabling fine-grained
	// permission control for automated processes.
	// +kubebuilder:validation:Optional
	Scopes []ServiceAccountScope `json:"scopes,omitempty"`

	// TokenSecretRef references a Kubernetes secret that should contain the
	// authentication token for this service account. This enables secure storage
	// and management of credentials within the cluster.
	// +kubebuilder:validation:Optional
	TokenSecretRef *corev1.SecretReference `json:"tokenSecretRef,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *common.Reconciliation `json:"reconciliation,omitempty"`
}

func (in *ServiceAccountSpec) ScopeAttributes() (result []*console.ScopeAttributes) {
	for _, scope := range in.Scopes {
		result = append(result, scope.Attributes())
	}

	return result
}

// ServiceAccountScope defines access restrictions for a service account, allowing
// fine-grained control over which Console APIs and resources can be accessed.
// This enables implementing least-privilege principles for automated systems.
type ServiceAccountScope struct {
	// API specifies a single Console API endpoint name that this service account
	// should be scoped to, such as 'updateServiceDeployment' or 'createCluster'.
	// +kubebuilder:validation:Optional
	// +kubebuilder:example:=updateServiceDeployment
	API *string `json:"api,omitempty"`

	// Apis is a list of Console API endpoint names that this service account
	// should be scoped to.
	// +kubebuilder:validation:Optional
	Apis []string `json:"apis,omitempty"`

	// Identifier specifies a resource ID in the Console API that this service
	// account should be scoped to. Leave blank or use '*' to scope to all resources
	// within the specified API endpoints.
	// +kubebuilder:validation:Optional
	Identifier *string `json:"identifier,omitempty"`

	// Ids is a list of Console API resource IDs that this service account should
	// be scoped to.
	// +kubebuilder:validation:Optional
	Ids []string `json:"ids,omitempty"`
}

func (in *ServiceAccountScope) Attributes() *console.ScopeAttributes {
	return &console.ScopeAttributes{
		API:        in.API,
		Apis:       in.Apis,
		Identifier: in.Identifier,
		Ids:        in.Ids,
	}
}
