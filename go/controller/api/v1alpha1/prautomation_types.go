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

// PrAutomationBindings defines access control for PR automation resources.
type PrAutomationBindings struct {
	// Create bindings.
	// +kubebuilder:validation:Optional
	Create []Binding `json:"create,omitempty"`

	// Write bindings.
	// +kubebuilder:validation:Optional
	Write []Binding `json:"write,omitempty"`
}

// +kubebuilder:object:root=true

// PrAutomationList contains a list of PrAutomation resources.
type PrAutomationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`

	Items []PrAutomation `json:"items"`
}

// +kubebuilder:object:root=true
// +kubebuilder:resource:scope=Cluster
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="ID",type="string",JSONPath=".status.id",description="ID of the PrAutomation in the Console API."

// PrAutomation provides a self-service mechanism for generating pull requests against IaC repositories.
// It enables teams to create standardized, templated PRs for common operations like cluster
// upgrades, service deployments, and configuration changes. Each automation defines the files to modify,
// the changes to make (via regex replacement, YAML overlays, or file creation), and provides a UI wizard
// for users to configure parameters before generating the PR.
type PrAutomation struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	// Spec defines the desired state of the PrAutomation, including the operations
	// to perform, target repository, and user interface configuration.
	// +kubebuilder:validation:Required
	Spec PrAutomationSpec `json:"spec"`

	// Status represents the current state of this PrAutomation resource.
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

// PrAutomationSpec defines the desired state of the PrAutomation.
type PrAutomationSpec struct {
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=CLUSTER;SERVICE;PIPELINE;UPDATE;UPGRADE;COST
	Role *console.PrRole `json:"role,omitempty"`

	// Addon links this automation to a specific add-on name.
	// +kubebuilder:validation:Optional
	Addon *string `json:"addon,omitempty"`

	// Branch specifies the base branch this PR will be created from. If not provided,
	// defaults to the repository's main branch (usually 'main' or 'master').
	// +kubebuilder:validation:Optional
	Branch *string `json:"branch,omitempty"`

	// Icon provides a URL to an icon image to visually represent this automation
	// in the user interface and catalogs.
	// +kubebuilder:validation:Optional
	Icon *string `json:"icon,omitempty"`

	// DarkIcon provides a URL to a dark-mode variant of the icon for improved
	// visibility in dark-themed user interfaces.
	// +kubebuilder:validation:Optional
	DarkIcon *string `json:"darkIcon,omitempty"`

	// Documentation provides detailed explanation of what this automation does,
	// when to use it, and any prerequisites or considerations.
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Identifier specifies the target repository in the format "organization/repository-name"
	// for GitHub, or equivalent formats for other SCM providers.
	// +kubebuilder:validation:Optional
	Identifier *string `json:"identifier,omitempty"`

	// Message defines the commit message template that will be used in the generated PR.
	// Can include templated variables from user input.
	// +kubebuilder:validation:Optional
	Message *string `json:"message,omitempty"`

	// Name specifies the display name for this automation in the Console API.
	// If not provided, defaults to the Kubernetes resource name.
	// +kubebuilder:validation:Optional
	Name *string `json:"name,omitempty"`

	// Title defines the template for the pull request title. Can include variables
	// that will be replaced with user-provided configuration values.
	// +kubebuilder:validation:Optional
	Title *string `json:"title,omitempty"`

	// Patch determines whether to generate a patch for this PR instead of
	// creating a full pull request.
	// +kubebuilder:validation:Optional
	Patch *bool `json:"patch,omitempty"`

	// ClusterRef references a specific cluster that this PR operates on.
	// +kubebuilder:validation:Optional
	ClusterRef *corev1.ObjectReference `json:"clusterRef,omitempty"`

	// ScmConnectionRef references the SCM connection to use for authentication when creating pull requests.
	// +kubebuilder:validation:Required
	ScmConnectionRef corev1.ObjectReference `json:"scmConnectionRef"`

	// RepositoryRef references a Git repository resource this automation uses.
	// +kubebuilder:validation:Optional
	RepositoryRef *corev1.ObjectReference `json:"repositoryRef,omitempty"`

	// ServiceRef references a specific service that this PR automation acts upon.
	// +kubebuilder:validation:Optional
	ServiceRef *corev1.ObjectReference `json:"serviceRef,omitempty"`

	// ProjectRef references the project this automation belongs to, enabling
	// project-scoped organization and access control.
	// +kubebuilder:validation:Optional
	ProjectRef *corev1.ObjectReference `json:"projectRef,omitempty"`

	// CatalogRef references the catalog this automation belongs to for
	// organizational purposes and discoverability in the service catalog.
	// +kubebuilder:validation:Optional
	CatalogRef *corev1.ObjectReference `json:"catalogRef,omitempty"`

	// Bindings containing read and write policies of PR automation.
	// +kubebuilder:validation:Optional
	Bindings *PrAutomationBindings `json:"bindings,omitempty"`

	// Configuration defines the self-service UI form fields that users fill out
	// to customize the generated PR. Each field can be templated into the PR content.
	// +kubebuilder:validation:Optional
	Configuration []PrAutomationConfiguration `json:"configuration,omitempty"`

	// Configuration for setting a secret as part of this pr.  This will usually be used by k8s manifests defined and is
	// securely handled by our api with RBAC validation.
	// +kubebuilder:validation:Optional
	Secrets *PrAutomationSecretConfiguration `json:"secrets,omitempty"`

	// Confirmation specifies additional verification steps or information to present
	// to users before they can generate the PR, ensuring prerequisites are met.
	// +kubebuilder:validation:Optional
	Confirmation *PrAutomationConfirmation `json:"confirmation,omitempty"`

	// Creates defines specifications for generating new files from templates,
	// allowing the automation to add new configuration files to the repository.
	// +kubebuilder:validation:Optional
	Creates *PrAutomationCreateConfiguration `json:"creates,omitempty"`

	// Updates specifies how to modify existing files using regex replacements
	// or YAML overlays, enabling precise changes to infrastructure code.
	// +kubebuilder:validation:Optional
	Updates *PrAutomationUpdateConfiguration `json:"updates,omitempty"`

	// Deletes specifies files and folders to remove from the repository as part
	// of the PR, useful for cleanup or migration scenarios.
	// +kubebuilder:validation:Optional
	Deletes *PrAutomationDeleteConfiguration `json:"deletes,omitempty"`
}

// PrAutomationDeleteConfiguration specifies files and folders to delete as part of the PR operation.
type PrAutomationDeleteConfiguration struct {
	// Individual files to delete.
	// +kubebuilder:validation:Optional
	Files []string `json:"files"`

	// Entire folders to delete.
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

// PrAutomationCreateConfiguration defines how to generate new files from templates during PR creation.
type PrAutomationCreateConfiguration struct {
	// Git location to source external files from.
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

// PrAutomationTemplate defines a single file template for creating new files in the target repository.
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

// PrAutomationUpdateConfiguration defines how to modify existing files in the target repository.
type PrAutomationUpdateConfiguration struct {
	// Files to update.
	// +kubebuilder:validation:Optional
	Files []*string `json:"files,omitempty"`

	// MatchStrategy, see enum for behavior.
	// +kubebuilder:validation:Optional
	MatchStrategy *console.MatchStrategy `json:"matchStrategy,omitempty"`

	// Full regex + replacement structs in case there is different behavior per regex
	// +kubebuilder:validation:Optional
	RegexReplacements []RegexReplacement `json:"regexReplacements,omitempty"`

	// Replacement via overlaying a yaml structure on an existing yaml file
	// +kubebuilder:validation:Optional
	YamlOverlays []YamlOverlay `json:"yamlOverlays,omitempty"`

	// Regexes to apply on each file.
	// +kubebuilder:validation:Optional
	Regexes []*string `json:"regexes,omitempty"`

	// ReplaceTemplate is a template to use when replacing a regex.
	// +kubebuilder:validation:Optional
	ReplaceTemplate *string `json:"replaceTemplate,omitempty"`

	// Yq (unused so far)
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

// RegexReplacement defines a specific find-and-replace operation using regular expressions.
type RegexReplacement struct {
	// Regex to match a substring on.
	// +kubebuilder:validation:Required
	Regex string `json:"regex"`

	// File this replacement will work on.
	// +kubebuilder:validation:Required
	File string `json:"file"`

	// Replacement to be substituted for the match in the regex.
	// +kubebuilder:validation:Required
	Replacement string `json:"replacement"`

	// Templated indicates whether you want to apply templating to the regex before compiling.
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

// YamlOverlay defines a YAML merge operation to modify existing YAML files.
type YamlOverlay struct {
	// File to execute the overlay on.
	// +kubebuilder:validation:Required
	File string `json:"file"`

	// Yaml (possibly templated) to use as the overlayed YAML blob written to the file.
	// +kubebuilder:validation:Required
	Yaml string `json:"yaml"`

	// Templated indicates whether you want to apply templating to the YAML blob before overlaying.
	// +kubebuilder:validation:Optional
	Templated *bool `json:"templated,omitempty"`

	// ListMerge defines how you want list merge to be performed, defaults to OVERWRITE.
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

// PrAutomationConfirmation defines additional verification steps before PR generation.
type PrAutomationConfirmation struct {
	// Text in Markdown to explain this PR.
	// +kubebuilder:validation:Optional
	Text *string `json:"text,omitempty"`

	// Checklist to present to confirm each prerequisite is satisfied.
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

// PrAutomationConfiguration defines a single input field in the self-service UI form.
type PrAutomationConfiguration struct {
	// Name is the identifier for this configuration field, used as a template variable
	// and as the form field name in the UI.
	// +kubebuilder:validation:Required
	Name string `json:"name"`

	// Type specifies the input type for this field, determining how it's rendered
	// in the UI and what validation is applied.
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=STRING;INT;BOOL;PASSWORD;ENUM;CLUSTER;PROJECT;GROUP;USER;FLOW
	Type console.ConfigurationType `json:"type"`

	// Condition defines when this field should be displayed based on the values
	// of other fields, enabling dynamic forms that adapt to user input.
	// +kubebuilder:validation:Optional
	*Condition `json:"condition,omitempty"`

	// Default provides a default value for this field.
	// +kubebuilder:validation:Optional
	Default *string `json:"default,omitempty"`

	// Documentation provides help text or description for this field to guide users in providing the correct input.
	// +kubebuilder:validation:Optional
	Documentation *string `json:"documentation,omitempty"`

	// Longform provides extended documentation or detailed explanation for complex configuration fields.
	// +kubebuilder:validation:Optional
	Longform *string `json:"longform,omitempty"`

	// DisplayName provides a human-readable label for this field in the UI.
	// If not provided, the Name field is used as the display label.
	// +kubebuilder:validation:Optional
	DisplayName *string `json:"displayName,omitempty"`

	// Optional indicates whether this field is required (false) or optional (true) for PR generation.
	// Required fields must be filled by the user.
	// +kubebuilder:validation:Optional
	Optional *bool `json:"optional,omitempty"`

	// Page specifies the page to use for the pr configuration in the Plural web configuration wizard
	// +kubebuilder:validation:Optional
	Page *int64 `json:"page,omitempty"`

	// Placeholder text to show in the input field to guide users on the expected format or content.
	// +kubebuilder:validation:Optional
	Placeholder *string `json:"placeholder,omitempty"`

	// Validation defines additional validation rules to apply to user input before allowing PR generation.
	// +kubebuilder:validation:Optional
	Validation *PrAutomationConfigurationValidation `json:"validation,omitempty"`

	// Values provides the list of allowed values for ENUM type fields, creating a dropdown selection in the UI.
	// +kubebuilder:validation:Optional
	Values []*string `json:"values,omitempty"`
}

// PrAutomationConfigurationValidation defines validation rules for configuration field inputs.
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
		DisplayName:   in.DisplayName,
		Page:          in.Page,
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

// Condition defines a conditional expression.
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

type PrAutomationSecretConfiguration struct {
	// The cluster handle that will hold this secret
	Cluster string `json:"cluster"`

	// The k8s namespace to place the secret in
	Namespace string `json:"namespace"`

	// The name of the secret
	Name string `json:"name"`

	// The entries of the secret
	Entries []PrAutomationSecretEntry `json:"entries"`
}

type PrAutomationSecretEntry struct {
	// The name of the secret entry
	Name string `json:"name"`

	// The documentation of the secret entry
	Documentation string `json:"documentation"`

	// Whether to autogenerate the secret entry
	// +kubebuilder:validation:Optional
	Autogenerate *bool `json:"autogenerate,omitempty"`
}

func (in *PrAutomationSecretConfiguration) Attributes() *console.PrSecretsAttributes {
	if in == nil {
		return nil
	}

	return &console.PrSecretsAttributes{
		Cluster:   lo.ToPtr(in.Cluster),
		Namespace: lo.ToPtr(in.Namespace),
		Name:      lo.ToPtr(in.Name),
		Entries: algorithms.Map(in.Entries, func(entry PrAutomationSecretEntry) *console.PrSecretEntryAttributes {
			return entry.Attributes()
		}),
	}
}

func (in *PrAutomationSecretEntry) Attributes() *console.PrSecretEntryAttributes {
	if in == nil {
		return nil
	}

	return &console.PrSecretEntryAttributes{
		Name:          lo.ToPtr(in.Name),
		Documentation: lo.ToPtr(in.Documentation),
		Autogenerate:  in.Autogenerate,
	}
}
