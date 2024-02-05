package v1alpha1

import (
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func init() {
	SchemeBuilder.Register(&PrAutomation{}, &PrAutomationList{})
}

// PrAutomationBindings ...
type PrAutomationBindings struct {
	// Create bindings.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`

	// Write bindings.
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`
}

// PrAutomationList ...
// +kubebuilder:object:root=true
type PrAutomationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []PrAutomation `json:"items"`
}

// PrAutomation ...
// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the pr automation in the Console API."
type PrAutomation struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec ...
	// +kubebuilder:validation:Required
	Spec PrAutomationSpec `json:"spec"`

	// Status ...
	// +kubebuilder:validation:Optional
	Status Status `json:"status,omitempty"`
}

// ConsoleID implements PluralResource interface
func (in *PrAutomation) ConsoleID() *string {
	return in.Status.ID
}

// ConsoleName implements PluralResource interface
func (in *PrAutomation) ConsoleName() string {
	if in.Spec.Name != nil && len(*in.Spec.Name) > 0 {
		return *in.Spec.Name
	}

	return in.Name
}

func (in *PrAutomation) Attributes(clusterID *string, serviceID *string, connectionID *string) *console.PrAutomationAttributes {
	attrs := console.PrAutomationAttributes{
		Name:          lo.ToPtr(in.ConsoleName()),
		Identifier:    in.Spec.Identifier,
		Documentation: in.Spec.Documentation,
		Title:         in.Spec.Title,
		Message:       in.Spec.Message,
		Branch:        in.Spec.Branch,
		Updates:       in.Spec.Updates.Attributes(),
		Addon:         in.Spec.Addon,
		ClusterID:     clusterID,
		ServiceID:     serviceID,
		ConnectionID:  connectionID,
		Configuration: algorithms.Map(in.Spec.Configuration, func(c PrAutomationConfiguration) *console.PrConfigurationAttributes {
			return c.Attributes()
		}),
	}

	if in.Spec.Bindings != nil {
		attrs.CreateBindings = algorithms.Map(in.Spec.Bindings.Create,
			func(b Binding) *console.PolicyBindingAttributes { return b.Attributes() })
		attrs.WriteBindings = algorithms.Map(in.Spec.Bindings.Write,
			func(b Binding) *console.PolicyBindingAttributes { return b.Attributes() })
	}

	return &attrs
}

func (s *PrAutomation) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(s.Spec)
	if err != nil {
		return false, "", err
	}

	return !s.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *PrAutomation) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// PrAutomationSpec ...
type PrAutomationSpec struct {
	// Addon is a link to an addon name
	// +kubebuilder:validation:Optional
	Addon *string `json:"addon,omitempty"`

	// Branch ...
	// +kubebuilder:validation:Optional
	Branch *string `json:"branch,omitempty"`

	// Documentation ...
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Identifier is a string referencing the repository, i.e. for GitHub it would be "<organization>/<repositoryName>"
	// +kubebuilder:validation:Optional
	Identifier *string `json:"identifier,omitempty"`

	// Message ...
	// +kubebuilder:validation:Optional
	Message *string `json:"message,omitempty"`

	// Name ...
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Title...
	// +kubebuilder:validation:Optional
	Title *string `json:"title,omitempty"`

	// ClusterRef ...
	// +kubebuilder:validation:Optional
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`

	// ScmConnectionRef ...
	// +kubebuilder:validation:Required
	ScmConnectionRef corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// RepositoryRef ...
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// ServiceRef ...
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// Bindings contain read and write policies of pr automation
	// +kubebuilder:validation:Optional
	Bindings *PrAutomationBindings `json:"bindings,omitempty"`

	// Configuration ...
	// +kubebuilder:validation:Optional
	Configuration []PrAutomationConfiguration `json:"configuration,omitempty"`

	// Creates ...
	// +kubebuilder:validation:Optional
	Creates *PrAutomationCreateConfiguration `json:"creates,omitempty"`

	// Updates ...
	// +kubebuilder:validation:Optional
	Updates *PrAutomationUpdateConfiguration `json:"updates,omitempty"`
}

// PrAutomationCreateConfiguration ...
type PrAutomationCreateConfiguration struct {
	// Git ...
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`

	// Templates ...
	// +kubebuilder:validation:Optional
	Templates []PrAutomationTemplate `json:"templates,omitempty"`
}

// PrAutomationTemplate ...
type PrAutomationTemplate struct {
	// Destination ...
	// +kubebuilder:validation:Required
	Destination string `json:"destination"`

	// External ...
	// +kubebuilder:validation:Required
	External bool `json:"external"`

	// Source ...
	// +kubebuilder:validation:Optional
	Source string `json:"source"`
}

// PrAutomationUpdateConfiguration ...
type PrAutomationUpdateConfiguration struct {
	// Files ...
	// +kubebuilder:validation:Optional
	Files []*string `json:"files,omitempty"`

	// MatchStrategy ...
	// +kubebuilder:validation:Optional
	MatchStrategy *console.MatchStrategy `json:"matchStrategy,omitempty"`

	// RegexReplacements ...
	// +kubebuilder:validation:Optional
	RegexReplacements []RegexReplacement `json:"regexReplacements,omitempty"`

	// Regexes ...
	// +kubebuilder:validation:Optional
	Regexes []*string `json:"regexes,omitempty"`

	// ReplaceTemplate ...
	// +kubebuilder:validation:Optional
	ReplaceTemplate *string `json:"replaceTemplate,omitempty"`

	// Yq ...
	// +kubebuilder:validation:Optional
	Yq *string `json:"yq,omitempty"`
}

func (in *PrAutomationUpdateConfiguration) Attributes() *console.PrAutomationUpdateSpecAttributes {
	if in == nil {
		return nil
	}

	return &console.PrAutomationUpdateSpecAttributes{
		Regexes: in.Regexes,
		RegexReplacements: algorithms.Map(in.RegexReplacements, func(rp RegexReplacement) *console.RegexReplacementAttributes {
			return rp.Attributes()
		}),
		Files:           in.Files,
		ReplaceTemplate: in.ReplaceTemplate,
		Yq:              in.Yq,
		MatchStrategy:   in.MatchStrategy,
	}
}

// RegexReplacement ...
type RegexReplacement struct {
	// Regex ...
	// +kubebuilder:validation:Required
	Regex string `json:"regex"`

	// Replacement ...
	// +kubebuilder:validation:Optional
	Replacement string `json:"replacement"`
}

func (in *RegexReplacement) Attributes() *console.RegexReplacementAttributes {
	return &console.RegexReplacementAttributes{
		Regex:       in.Regex,
		Replacement: in.Replacement,
	}
}

// PrAutomationConfiguration ...
type PrAutomationConfiguration struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// +kubebuilder:validation:Required
	Type console.ConfigurationType `json:"type"`

	// +kubebuilder:validation:Optional
	*Condition `json:"condition,omitempty"`

	// +kubebuilder:validation:Optional
	Default *string `json:"default,omitempty"`

	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// +kubebuilder:validation:Optional
	Longform *string `json:"longform,omitempty"`

	// +kubebuilder:validation:Optional
	Optional *bool `json:"optional,omitempty"`

	// +kubebuilder:validation:Optional
	Placeholder *string `json:"placeholder,omitempty"`
}

func (in *PrAutomationConfiguration) Attributes() *console.PrConfigurationAttributes {
	return &console.PrConfigurationAttributes{
		Type:          in.Type,
		Name:          in.Name,
		Default:       in.Default,
		Documentation: in.Documentation,
		Longform:      in.Longform,
		Placeholder:   in.Placeholder,
		Optional:      in.Optional,
		Condition:     in.Condition.Attributes(),
	}
}

// Condition ...
type Condition struct {
	// +kubebuilder:validation:Required
	Field string `json:"field"`

	// +kubebuilder:validation:Required
	console.Operation `json:"operation"`

	// +kubebuilder:validation:Optional
	Value *string `json:"value,omitempty"`
}

func (in *Condition) Attributes() *console.ConditionAttributes {
	return &console.ConditionAttributes{
		Operation: in.Operation,
		Field:     in.Field,
		Value:     in.Value,
	}
}
