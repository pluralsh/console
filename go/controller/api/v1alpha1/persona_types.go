package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

//+kubebuilder:object:root=true

// PersonaList contains a list of Persona
type PersonaList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Persona `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="Persona ID"

// Persona is the Schema for the personas API
type Persona struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   PersonaSpec `json:"spec,omitempty"`
	Status Status      `json:"status,omitempty"`
}

func (in *Persona) PersonaName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *Persona) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// ConsoleID implements PluralResource interface
func (in *Persona) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements PluralResource interface
func (in *Persona) ConsoleName() string {
	return in.PersonaName()
}

func (in *Persona) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *Persona) Attributes() console.PersonaAttributes {
	return console.PersonaAttributes{
		Name:          lo.ToPtr(in.PersonaName()),
		Description:   in.Spec.Description,
		Role:          in.Spec.Role,
		Configuration: in.Spec.Configuration.Attributes(),
		Bindings: algorithms.Map(PolicyBindings(in.Spec.Bindings), func(binding *console.PolicyBindingAttributes) *console.BindingAttributes {
			return &console.BindingAttributes{
				ID:      binding.ID,
				UserID:  binding.UserID,
				GroupID: binding.GroupID,
			}
		}),
	}
}

// PersonaSpec defines the desired state of Persona
type PersonaSpec struct {
	// Name of this Persona. If not provided Persona's own name from Persona.ObjectMeta will be used.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Longform description of this Persona.
	// +kubebuilder:validation:Optional
	Description *string `json:"description,omitempty"`

	// Role of this Persona controls the behavior of the homepage.
	// +kubebuilder:validation:Optional
	Role *console.PersonaRole `json:"role,omitempty"`

	// Configuration contains the UI configuration for this Persona (additive across personas)".
	// +kubebuilder:validation:Optional
	Configuration *PersonaConfiguration `json:"configuration,omitempty"`

	// Bindings contains the group bindings for this Persona.
	// +kubebuilder:validation:Optional
	Bindings []Binding `json:"bindings,omitempty"`
}

type PersonaConfiguration struct {
	// All enables full UI for this Persona.
	// +kubebuilder:validation:Optional
	All *bool `json:"all,omitempty"`

	// Home contains configuration for the homepage for this Persona.
	// +kubebuilder:validation:Optional
	Home *PersonaHome `json:"home,omitempty"`

	// Deployments enable individual parts of the deployments views.
	// +kubebuilder:validation:Optional
	Deployments *PersonaDeployment `json:"deployments,omitempty"`

	// Sidebar enables individual aspects of the sidebar.
	// +kubebuilder:validation:Optional
	Sidebar *PersonaSidebar `json:"sidebar,omitempty"`

	// Services enable individual parts of the services views.
	// +kubebuilder:validation:Optional
	Services *PersonaServices `json:"services,omitempty"`
}

func (in *PersonaConfiguration) Attributes() *console.PersonaConfigurationAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaConfigurationAttributes{
		All:         in.All,
		Home:        in.Home.Attributes(),
		Deployments: in.Deployments.Attributes(),
		Sidebar:     in.Sidebar.Attributes(),
		Services:    in.Services.Attributes(),
	}
}

type PersonaHome struct {
	// +kubebuilder:validation:Optional
	Manager *bool `json:"manager,omitempty"`

	// +kubebuilder:validation:Optional
	Security *bool `json:"security,omitempty"`
}

func (in *PersonaHome) Attributes() *console.PersonaHomeAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaHomeAttributes{
		Manager:  in.Manager,
		Security: in.Security,
	}
}

type PersonaServices struct {
	// +kubebuilder:validation:Optional
	Secrets *bool `json:"secrets,omitempty"`

	// +kubebuilder:validation:Optional
	Configuration *bool `json:"configuration,omitempty"`
}

func (in *PersonaServices) Attributes() *console.PersonaServicesAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaServicesAttributes{
		Secrets:       in.Secrets,
		Configuration: in.Configuration,
	}
}

type PersonaDeployment struct {
	// +kubebuilder:validation:Optional
	Clusters *bool `json:"clusters,omitempty"`

	// +kubebuilder:validation:Optional
	Deployments *bool `json:"deployments,omitempty"`

	// +kubebuilder:validation:Optional
	Repositories *bool `json:"repositories,omitempty"`

	// +kubebuilder:validation:Optional
	Services *bool `json:"services,omitempty"`

	// +kubebuilder:validation:Optional
	Pipelines *bool `json:"pipelines,omitempty"`

	// +kubebuilder:validation:Optional
	Providers *bool `json:"providers,omitempty"`

	// +kubebuilder:validation:Optional
	AddOns *bool `json:"addOns,omitempty"`
}

func (in *PersonaDeployment) Attributes() *console.PersonaDeploymentAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaDeploymentAttributes{
		Clusters:     in.Clusters,
		Deployments:  in.Deployments,
		Repositories: in.Repositories,
		Services:     in.Services,
		Pipelines:    in.Pipelines,
		Providers:    in.Providers,
		AddOns:       in.AddOns,
	}
}

type PersonaSidebar struct {
	// +kubebuilder:validation:Optional
	Audits *bool `json:"audits,omitempty"`

	// +kubebuilder:validation:Optional
	Kubernetes *bool `json:"kubernetes,omitempty"`

	// +kubebuilder:validation:Optional
	PullRequests *bool `json:"pullRequests,omitempty"`

	// +kubebuilder:validation:Optional
	Settings *bool `json:"settings,omitempty"`

	// +kubebuilder:validation:Optional
	Backups *bool `json:"backups,omitempty"`

	// +kubebuilder:validation:Optional
	Stacks *bool `json:"stacks,omitempty"`

	// +kubebuilder:validation:Optional
	Security *bool `json:"security,omitempty"`

	// +kubebuilder:validation:Optional
	Cost *bool `json:"cost,omitempty"`
}

func (in *PersonaSidebar) Attributes() *console.PersonaSidebarAttributes {
	if in == nil {
		return nil
	}

	return &console.PersonaSidebarAttributes{
		Audits:       in.Audits,
		Kubernetes:   in.Kubernetes,
		PullRequests: in.PullRequests,
		Settings:     in.Settings,
		Backups:      in.Backups,
		Stacks:       in.Stacks,
		Security:     in.Security,
		Cost:         in.Cost,
	}
}

func init() {
	SchemeBuilder.Register(&Persona{}, &PersonaList{})
}
