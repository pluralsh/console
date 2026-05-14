package v1alpha1

import (
	"time"

	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&UpgradeInsights{}, &UpgradeInsightsList{})
}

const (
	defaultReconcileInterval = 10 * time.Minute
)

// UpgradeInsightsList contains a list of UpgradeInsights
// +kubebuilder:object:root=true
type UpgradeInsightsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []UpgradeInsights `json:"items"`
}

// UpgradeInsights is the Schema for the UpgradeInsights API
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the UpgradeInsights in the Console API."
type UpgradeInsights struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   UpgradeInsightsSpec `json:"spec,omitempty"`
	Status Status              `json:"status,omitempty"`
}

func (in *UpgradeInsights) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

type UpgradeInsightsDistro string

type UpgradeInsightsSpec struct {
	// Distro defines which provider API should be used to fetch latest upgrade insights.
	// If not provided, we get the distro from the Plural API cluster tied to this operator deploy token.
	// +kubebuilder:validation:Enum=EKS
	// +kubebuilder:validation:Optional
	Distro *console.ClusterDistro `json:"distro,omitempty"`

	// ClusterName is your cloud provider cluster identifier (usually name) that is used
	// to fetch latest upgrade insights information from the cloud provider API.
	// If not provided, we get the cluster name from the Plural API cluster tied to this
	// operator deploy token and assume that it is the same as the cluster name in your cloud provider.
	// +kubebuilder:validation:Optional
	ClusterName *string `json:"clusterName,omitempty"`

	// Interval defines how often should the upgrade insights information be fetched.
	// +kubebuilder:default="10m"
	// +kubebuilder:validation:Optional
	Interval *string `json:"interval,omitempty"`

	// Credentials allow overriding default provider credentials bound to the operator.
	// +kubebuilder:validation:Optional
	Credentials *ProviderCredentials `json:"credentials,omitempty"`
}

func (in *UpgradeInsightsSpec) GetDistro(defaultDistro *console.ClusterDistro) *console.ClusterDistro {
	if in.Distro != nil {
		return in.Distro
	}

	return defaultDistro
}
func (in *UpgradeInsightsSpec) GetClusterName(defaultClusterName string) string {
	if in.ClusterName != nil {
		return *in.ClusterName
	}

	return defaultClusterName
}

func (in *UpgradeInsightsSpec) GetInterval() time.Duration {
	if in.Interval == nil {
		return defaultReconcileInterval
	}

	interval, err := time.ParseDuration(*in.Interval)
	if err != nil {
		return defaultReconcileInterval
	}

	return interval
}

type ProviderCredentials struct {
	// AWS defines attributes required to auth with AWS API.
	// +kubebuilder:validation:Optional
	AWS *AWSProviderCredentials `json:"aws,omitempty"`
}

type AWSProviderCredentials struct {
	// Region is the name of the AWS region cluster lives in.
	// +kubebuilder:validation:Required
	Region string `json:"region"`

	// AccessKeyID is your access key ID used to authenticate against AWS API.
	// +kubebuilder:validation:Optional
	AccessKeyID *string `json:"accessKeyID,omitempty"`

	// SecretAccessKeyRef is a reference to the secret that contains secret access key.
	// Since UpgradeInsights is a cluster-scoped resource we can't use local reference.
	//
	// SecretAccessKey must be stored in a key named "secretAccessKey".
	//
	// An example secret can look like this:
	//	apiVersion: v1
	//	kind: Secret
	//	metadata:
	//    name: eks-credentials
	//    namespace: upgrade-insights-test
	//	stringData:
	//    secretAccessKey: "changeme"
	//
	// Then it can be referenced like this:
	//    ...
	//    secretAccessKeyRef:
	//      name: eks-credentials
	//      namespace: upgrade-insights-test
	//
	// +kubebuilder:validation:Optional
	SecretAccessKeyRef *corev1.SecretReference `json:"secretAccessKeyRef,omitempty"`
}
