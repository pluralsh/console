package v1alpha1

import (
	console "github.com/pluralsh/console/go/client"
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

func (in *PrAutomation) Attributes(clusterID *string, serviceID *string, connectionID *string, repositoryID *string) *console.PrAutomationAttributes {
	attrs := console.PrAutomationAttributes{
		Name:          lo.ToPtr(in.ConsoleName()),
		Role:          in.Spec.Role,
		Identifier:    in.Spec.Identifier,
		Documentation: in.Spec.Documentation,
		Title:         in.Spec.Title,
		Message:       in.Spec.Message,
		Branch:        in.Spec.Branch,
		Updates:       in.Spec.Updates.Attributes(),
		Creates:       in.Spec.Creates.Attributes(),
		Deletes:       in.Spec.Deletes.Attributes(),
		Addon:         in.Spec.Addon,
		ClusterID:     clusterID,
		ServiceID:     serviceID,
		ConnectionID:  connectionID,
		RepositoryID:  repositoryID,
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

func (in *PrAutomation) Diff(hasher Hasher) (changed bool, sha string, err error) {
	currentSha, err := hasher(in.Spec)
	if err != nil {
		return false, "", err
	}

	return !in.Status.IsSHAEqual(currentSha), currentSha, nil
}

func (in *PrAutomation) SetCondition(condition metav1.Condition) {
	meta.SetStatusCondition(&in.Status.Conditions, condition)
}

// PrAutomationSpec ...
type PrAutomationSpec struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=CLUSTER;SERVICE;PIPELINE;UPDATE;UPGRADE
	Role *console.PrRole `json:"role,omitempty"`

	// Addon is a link to an addon name
	// +kubebuilder:validation:Optional
	Addon *string `json:"addon,omitempty"`

	// The base branch this pr will be based on (defaults to the repo's main branch)
	// +kubebuilder:validation:Optional
	Branch *string `json:"branch,omitempty"`

	// Documentation ...
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Identifier is a string referencing the repository, i.e. for GitHub it would be "<organization>/<repositoryName>"
	// +kubebuilder:validation:Optional
	Identifier *string `json:"identifier,omitempty"`

	// Message the commit message this pr will incorporate
	// +kubebuilder:validation:Optional
	Message *string `json:"message,omitempty"`

	// Name name of the automation in the console api (defaults to metadata.name)
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Title the title of the generated pr
	// +kubebuilder:validation:Optional
	Title *string `json:"title,omitempty"`

	// ClusterRef a cluster this pr works on
	// +kubebuilder:validation:Optional
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`

	// ScmConnectionRef the SCM connection to use for generating this PR
	// +kubebuilder:validation:Required
	ScmConnectionRef corev1.ObjectReference `json:"scmConnectionRef,omitempty"`

	// RepositoryRef ...
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// ServiceRef the service this PR acts on
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// Bindings contain read and write policies of pr automation
	// +kubebuilder:validation:Optional
	Bindings *PrAutomationBindings `json:"bindings,omitempty"`

	// Configuration self-service configuration for the UI wizard generating this PR
	// +kubebuilder:validation:Optional
	Configuration []PrAutomationConfiguration `json:"configuration,omitempty"`

	// Specs for files to be templated and created
	// +kubebuilder:validation:Optional
	Creates *PrAutomationCreateConfiguration `json:"creates,omitempty"`

	// Spec for files to be updated, using regex replacement
	// +kubebuilder:validation:Optional
	Updates *PrAutomationUpdateConfiguration `json:"updates,omitempty"`

	// Spec for files and folders to be deleted
	// +kubebuilder:validation:Optional
	Deletes *PrAutomationDeleteConfiguration `json:"deletes,omitempty"`
}

type PrAutomationDeleteConfiguration struct {
	// Individual files to delete
	// +kubebuilder:validation:Optional
	Files []string `json:"files"`

	// Entire folders to delete
	// +kubebuilder:validation:Optional
	Folders []string `json:"folders"`
}

func (in *PrAutomationDeleteConfiguration) Attributes() *console.PrAutomationDeleteSpecAttributes {
	if in == nil {
		return nil
	}

	return &console.PrAutomationDeleteSpecAttributes{
		Files:   in.Files,
		Folders: in.Folders,
	}
}

// PrAutomationCreateConfiguration ...
type PrAutomationCreateConfiguration struct {
	// Git Location to source external files from
	// +kubebuilder:validation:Optional
	Git *GitRef `json:"git,omitempty"`

	// Template files to use to generate file content
	// +kubebuilder:validation:Optional
	Templates []PrAutomationTemplate `json:"templates,omitempty"`
}

func (in *PrAutomationCreateConfiguration) Attributes() *console.PrAutomationCreateSpecAttributes {
	if in == nil {
		return nil
	}

	return &console.PrAutomationCreateSpecAttributes{
		Git: in.Git.Attributes(),
		Templates: algorithms.Map(in.Templates, func(c PrAutomationTemplate) *console.PrAutomationTemplateAttributes {
			return c.Attributes()
		}),
	}
}

// PrAutomationTemplate ...
type PrAutomationTemplate struct {
	// The destination to write the file to
	// +kubebuilder:validation:Required
	Destination string `json:"destination"`

	// Whether it is being sourced from an external git repository
	// +kubebuilder:validation:Required
	External bool `json:"external"`

	// The source file to use for templating
	// +kubebuilder:validation:Optional
	Source string `json:"source"`
}

func (in *PrAutomationTemplate) Attributes() *console.PrAutomationTemplateAttributes {
	if in == nil {
		return nil
	}

	return &console.PrAutomationTemplateAttributes{
		Source:      in.Source,
		Destination: in.Destination,
		External:    in.External,
	}
}

// PrAutomationUpdateConfiguration ...
type PrAutomationUpdateConfiguration struct {
	// Files to update
	// +kubebuilder:validation:Optional
	Files []*string `json:"files,omitempty"`

	// MatchStrategy, see enum for behavior
	// +kubebuilder:validation:Optional
	MatchStrategy *console.MatchStrategy `json:"matchStrategy,omitempty"`

	// Full regex + replacement structs in case there is different behavior per regex
	// +kubebuilder:validation:Optional
	RegexReplacements []RegexReplacement `json:"regexReplacements,omitempty"`

	// The regexes to apply on each file
	// +kubebuilder:validation:Optional
	Regexes []*string `json:"regexes,omitempty"`

	// The template to use when replacing a regex
	// +kubebuilder:validation:Optional
	ReplaceTemplate *string `json:"replaceTemplate,omitempty"`

	// (Unused so far)
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
	// The regex to match a substring on
	// +kubebuilder:validation:Required
	Regex string `json:"regex"`

	// The file this replacement will work on
	// +kubebuilder:validation:Required
	File string `json:"file"`

	// Replacement to be substituted for the match in the regex
	// +kubebuilder:validation:Required
	Replacement string `json:"replacement"`

	// Whether you want to apply templating to the regex before compiling
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated"`
}

func (in *RegexReplacement) Attributes() *console.RegexReplacementAttributes {
	return &console.RegexReplacementAttributes{
		Regex:       in.Regex,
		Replacement: in.Replacement,
		File:        in.File,
		Templated:   in.Templated,
	}
}

// PrAutomationConfiguration ...
type PrAutomationConfiguration struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=STRING;INT;BOOL;DOMAIN;BUCKET;FILE;FUNCTION;PASSWORD;ENUM
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

	// +kubebuilder:validation:Optional
	Values []*string `json:"values,omitempty"`
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
		Values:        in.Values,
	}
}

// Condition ...
type Condition struct {
	// +kubebuilder:validation:Required
	Field string `json:"field"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=NOT;GT;LT;EQ;GTE;LTE;PREFIX;SUFFIX
	console.Operation `json:"operation"`

	// +kubebuilder:validation:Optional
	Value *string `json:"value,omitempty"`
}

func (in *Condition) Attributes() *console.ConditionAttributes {
	if in == nil {
		return nil
	}

	return &console.ConditionAttributes{
		Operation: in.Operation,
		Field:     in.Field,
		Value:     in.Value,
	}
}
