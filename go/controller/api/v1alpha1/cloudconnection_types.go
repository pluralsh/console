package v1alpha1

import (
	"context"

	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"
)

func init() {
	SchemeBuilder.Register(&CloudConnection{}, &CloudConnectionList{})
}

//+kubebuilder:object:root=true

// CloudConnectionList contains a list of CloudConnection resources.
type CloudConnectionList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []CloudConnection `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster
//+kubebuilder:printcolumn:name="Id",type="string",JSONPath=".status.id",description="Console ID"
//+kubebuilder:printcolumn:name="Provider",type="string",JSONPath=".spec.provider",description="Name of the Provider cloud service."

// CloudConnection is a credential for querying a cloud provider.  It will be used in agentic chats to perform generic sql-like
// queries against cloud configuration data.
type CloudConnection struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CloudConnectionSpec `json:"spec,omitempty"`
	Status Status              `json:"status,omitempty"`
}

// CloudConnectionGetter is just a helper function that can be implemented to properly
// build Console API attributes
// +kubebuilder:object:generate:=false
type CloudConnectionGetter func(context.Context, CloudConnection) (*console.CloudConnectionAttributes, error)

func (c *CloudConnection) Diff(ctx context.Context, getter CloudConnectionGetter, hasher Hasher) (changed bool, sha string, err error) {
	cloudSettings, err := getter(ctx, *c)
	if err != nil {
		return false, "", err
	}

	currentSha, err := hasher(cloudSettings)
	if err != nil {
		return false, "", err
	}

	return !c.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (c *CloudConnection) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&c.Status.Conditions, condition)
}

func (c *CloudConnection) CloudConnectionName() string {
	if c.Spec.Name != nil && len(*c.Spec.Name) > 0 {
		return *c.Spec.Name
	}
	return c.Name
}

// CloudConnectionSpec defines the desired state of CloudConnection
type CloudConnectionSpec struct {
	// Name of this CloudConnection. If not provided CloudConnection's own name
	// from CloudConnection.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Provider is the name of the cloud service for the Provider.
	// One of (CloudProvider): [gcp, aws, azure]
	// +kubebuilder:example:=aws
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Type:=string
	// +kubebuilder:validation:Enum:=gcp;aws;azure
	// +kubebuilder:validation:XValidation:rule="self == oldSelf",message="Provider is immutable"
	Provider CloudProvider `json:"provider"`

	// Configuration contains the cloud connection configuration.
	// +kubebuilder:validation:Required
	Configuration CloudConnectionConfiguration `json:"configuration"`

	// ReadBindings is a list of bindings that defines
	// who can use this CloudConnection.
	// +kubebuilder:validation:Optional
	ReadBindings []Binding `json:"readBindings,omitempty"`

	// Reconciliation settings for this resource.
	// Controls drift detection and reconciliation intervals for this resource.
	// +kubebuilder:validation:Optional
	Reconciliation *Reconciliation `json:"reconciliation,omitempty"`
}

// Hasher provides a function interface for generating hash values from objects
// to enable drift detection and state comparison for Provider resources.
// +kubebuilder:object:generate:=false
type Hasher func(interface{}) (string, error)

// CloudProvider represents the supported cloud service providers.
type CloudProvider string

const (
	// AWS represents Amazon Web Services as a cloud provider
	AWS CloudProvider = "aws"
	// Azure represents Microsoft Azure as a cloud provider
	Azure CloudProvider = "azure"
	// GCP represents Google Cloud Platform as a cloud provider
	GCP CloudProvider = "gcp"
)

// CloudConnectionConfiguration contains provider-specific credential configurations.
// Only one provider configuration should be specified per CloudConnection instance.
type CloudConnectionConfiguration struct {
	AWS   *AWSCloudConnection   `json:"aws,omitempty"`
	GCP   *GCPCloudConnection   `json:"gcp,omitempty"`
	Azure *AzureCloudConnection `json:"azure,omitempty"`
}

// AWSCloudConnection contains AWS-specific authentication configuration.
// Enables cloud resource discovery and analysis across AWS resources and infrastructure.
type AWSCloudConnection struct {
	AccessKeyId     string             `json:"accessKeyId"`
	SecretAccessKey ObjectKeyReference `json:"secretAccessKey"`

	// The region this connection applies to
	// +kubebuilder:validation:Optional
	Region *string `json:"region"`

	// A list of regions this connection can query
	// +kubebuilder:validation:Optional
	Regions []string `json:"regions"`
}

// GCPCloudConnection contains Google Cloud Platform authentication configuration.
// Enables cloud resource discovery and analysis across GCP projects.
type GCPCloudConnection struct {
	ServiceAccountKey ObjectKeyReference `json:"serviceAccountKey"`
	ProjectId         string             `json:"projectId"`
}

// AzureCloudConnection contains Microsoft Azure authentication configuration.
// Provides credentials for discovering and querying Azure resources.
type AzureCloudConnection struct {
	SubscriptionId string             `json:"subscriptionId"`
	TenantId       string             `json:"tenantId"`
	ClientId       string             `json:"clientId"`
	ClientSecret   ObjectKeyReference `json:"clientSecret"`
}
