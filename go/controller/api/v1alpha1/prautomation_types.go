package v1alpha1

import (
	"github.com/pluralsh/polly/algorithms"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	console "github.com/pluralsh/console/go/client"

	"k8s.io/apimachinery/pkg/runtime"
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

func (in *PrAutomation) Attributes(clusterID, serviceID, connectionID, repositoryID, projectID *string) *console.PrAutomationAttributes {
	attrs := console.PrAutomationAttributes{
		Name:          lo.ToPtr(in.ConsoleName()),
		Role:          in.Spec.Role,
		Identifier:    in.Spec.Identifier,
		Documentation: in.Spec.Documentation,
		Title:         in.Spec.Title,
		Message:       in.Spec.Message,
		Branch:        in.Spec.Branch,
		Icon:          in.Spec.Icon,
		DarkIcon:      in.Spec.DarkIcon,
		Updates:       in.Spec.Updates.Attributes(),
		Creates:       in.Spec.Creates.Attributes(),
		Deletes:       in.Spec.Deletes.Attributes(),
		Addon:         in.Spec.Addon,
		ClusterID:     clusterID,
		ServiceID:     serviceID,
		ConnectionID:  connectionID,
		RepositoryID:  repositoryID,
		ProjectID:     projectID,
		Confirmation:  in.Spec.Confirmation.Attributes(),
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

	// An icon url to annotate this pr automation
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// An darkmode icon url to annotate this pr automation
	// +kubebuilder:validation:Optional
	DarkIcon *string `json:"darkIcon,omitempty"`

	// Documentation ...
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Identifier is a string referencing the repository, i.e. for GitHub it would be "organization/repositoryName"
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
	ScmConnectionRef corev1.ObjectReference `json:"scmConnectionRef"`

	// RepositoryRef the repository this automation uses.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// ServiceRef the service this PR acts on.
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// ProjectRef the project this automation belongs to.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// CatalogRef the catalog this automation will belong to
	// +kubebuilder:validation:Optional
	CatalogRef *corev1.ObjectReference `json:"catalogRef,omitempty"`

	// Bindings contain read and write policies of pr automation
	// +kubebuilder:validation:Optional
	Bindings *PrAutomationBindings `json:"bindings,omitempty"`

	// Configuration self-service configuration for the UI wizard generating this PR
	// +kubebuilder:validation:Optional
	Configuration []PrAutomationConfiguration `json:"configuration,omitempty"`

	// Additional details to verify all prerequisites are satisfied before generating this pr
	// +kubebuilder:validation:Optional
	Confirmation *PrAutomationConfirmation `json:"confirmation,omitempty"`

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

	// Additional context overrides to apply to this template, will be merged into the user-provided configuration options
	// +kubebuilder:validation:Optional
	Context *runtime.RawExtension `json:"context,omitempty"`

	// Condition string that will be evaluated to determine if source files should be copied or not.
	// +kubebuilder:validation:Optional
	Condition *string `json:"condition,omitempty"`
}

func (in *PrAutomationTemplate) Attributes() *console.PrAutomationTemplateAttributes {
	if in == nil {
		return nil
	}

	var context *string
	if in.Context != nil {
		context = lo.ToPtr(string(in.Context.Raw))
	}

	return &console.PrAutomationTemplateAttributes{
		Source:      in.Source,
		Destination: in.Destination,
		External:    in.External,
		Context:     context,
		Condition:   in.Condition,
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

	// Replacement via overlaying a yaml structure on an existing yaml file
	// +kubebuilder:validation:Optional
	YamlOverlays []YamlOverlay `json:"yamlOverlays,omitempty"`

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
		YamlOverlays: algorithms.Map(in.YamlOverlays, func(yo YamlOverlay) *console.YamlOverlayAttributes {
			return yo.Attributes()
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

// YamlOverlay ...
type YamlOverlay struct {
	// the file to execute the overlay on
	// +kubebuilder:validation:Required
	File string `json:"file"`

	// the (possibly templated) yaml to use as the overlayed yaml blob written to the file
	// +kubebuilder:validation:Required
	Yaml string `json:"yaml"`

	// Whether you want to apply templating to the yaml blob before overlaying
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`

	// How you want list merge to be performed, defaults to OVERWRITE
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=OVERWRITE;APPEND
	ListMerge *console.ListMerge `json:"listMerge,omitempty"`
}

func (in *YamlOverlay) Attributes() *console.YamlOverlayAttributes {
	return &console.YamlOverlayAttributes{
		Yaml:      in.Yaml,
		File:      in.File,
		Templated: in.Templated,
		ListMerge: in.ListMerge,
	}
}

// Additional details to verify all prerequisites are satisfied before generating this pr
type PrAutomationConfirmation struct {
	// Markdown text to explain this pr
	// +kubebuilder:validation:Optional
	Text *string `json:"text,omitempty"`

	// An itemized checklist to present to confirm each prerequisite is satisfied
	// +kubebuilder:validation:Optional
	Checklist []PrConfirmationChecklist `json:"checklist,omitempty"`
}

// A checkbox to render to confirm a PR prerequisite is satisfied
type PrConfirmationChecklist struct {
	// The label of this checkbox
	Label string `json:"label"`
}

func (in *PrAutomationConfirmation) Attributes() *console.PrConfirmationAttributes {
	if in == nil {
		return nil
	}

	return &console.PrConfirmationAttributes{
		Text: in.Text,
		Checklist: algorithms.Map(in.Checklist, func(item PrConfirmationChecklist) *console.PrChecklistAttributes {
			return &console.PrChecklistAttributes{Label: item.Label}
		}),
	}
}

// PrAutomationConfiguration ...
type PrAutomationConfiguration struct {
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=STRING;INT;BOOL;DOMAIN;BUCKET;FILE;FUNCTION;PASSWORD;ENUM;CLUSTER;PROJECT
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

	// Any additional validations you want to apply to this configuration item before generating a pr
	// +kubebuilder:validation:Optional
	Validation *PrAutomationConfigurationValidation `json:"validation,omitempty"`

	// +kubebuilder:validation:Optional
	Values []*string `json:"values,omitempty"`
}

// PrAutomationConfigurationValidation validations to apply to configuration items in a PR Automation
type PrAutomationConfigurationValidation struct {
	// A regex to match string-valued configuration items
	// +kubebuilder:validation:Optional
	Regex *string `json:"regex,omitempty"`

	// Whether the string value is supposed to be json-encoded
	// +kubebuilder:validation:Optional
	Json *bool `json:"json,omitempty"`

	// How to determine uniquenss for this field
	// +kubebuilder:validation:Optional
	UniqBy *PrAutomationUniqBy `json:"uniqBy,omitempty"`
}

type PrAutomationUniqBy struct {
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=PROJECT;CLUSTER
	Scope console.ValidationUniqScope `json:"scope"`
}

func (in *PrAutomationUniqBy) Attributes() *console.UniqByAttributes {
	if in == nil {
		return nil
	}

	return &console.UniqByAttributes{Scope: in.Scope}
}

func (in *PrAutomationConfiguration) Attributes() *console.PrConfigurationAttributes {
	conf := &console.PrConfigurationAttributes{
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

	if in.Validation != nil {
		conf.Validation = &console.ConfigurationValidationAttributes{
			Regex:  in.Validation.Regex,
			JSON:   in.Validation.Json,
			UniqBy: in.Validation.UniqBy.Attributes(),
		}
	}

	return conf
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
