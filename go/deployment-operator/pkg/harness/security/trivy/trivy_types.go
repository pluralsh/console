package trivy

import (
	ftypes "github.com/aquasecurity/trivy/pkg/fanal/types"
	"github.com/aquasecurity/trivy/pkg/types"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"

	v1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"
)

// Scanner is a scanner implementation for trivy.
type Scanner struct {
	v1.DefaultScanner `json:",inline"`

	// CustomPolicies enables loading custom policies from the .plural/policies
	// subdirectory of the stack tarball.
	CustomPolicies bool
}

// Report is an inline wrapper around original trivy report to
// better organize the data transformation to [console.StackPolicyViolationAttributes].
type Report struct {
	types.Report `json:",inline"`
}

// maxDescriptionLen is the maximum allowed length for a policy violation description,
// matching the server-side DB column constraint.
const maxDescriptionLen = 255

// coalesce returns the first non-empty string from the provided candidates.
func coalesce(candidates ...string) string {
	for _, s := range candidates {
		if len(s) > 0 {
			return s
		}
	}
	return "N/A"
}

// Attributes transforms a trivy [types.Report] into the format acceptable by the Console API.
// Violations are grouped by policyId (the server enforces uniqueness per stack run);
// multiple affected resources for the same policy are merged as separate causes.
func (in *Report) Attributes() []*console.StackPolicyViolationAttributes {
	// grouped preserves insertion order while deduplicating by policyId.
	grouped := make(map[string]*console.StackPolicyViolationAttributes)
	order := make([]string, 0)

	for _, result := range in.Results {
		// Initially we only care about misconfigurations
		// TODO: Extend to other checks
		for _, misconfig := range result.Misconfigurations {
			attr := in.fromDetectedMisconfiguration(result.Target, misconfig)
			if existing, ok := grouped[misconfig.ID]; ok {
				existing.Causes = append(existing.Causes, attr.Causes...)
			} else {
				grouped[misconfig.ID] = &attr
				order = append(order, misconfig.ID)
			}
		}
	}

	out := make([]*console.StackPolicyViolationAttributes, 0, len(grouped))
	for _, id := range order {
		out = append(out, grouped[id])
	}
	return out
}

func (in *Report) fromDetectedMisconfiguration(target string, misconfig types.DetectedMisconfiguration) console.StackPolicyViolationAttributes {
	desc := coalesce(misconfig.Description, misconfig.Message, misconfig.Title)
	if len([]rune(desc)) > maxDescriptionLen {
		desc = string([]rune(desc)[:maxDescriptionLen])
	}

	policyURL := coalesce(append([]string{misconfig.PrimaryURL}, misconfig.References...)...)
	policyModule := coalesce(misconfig.Query, misconfig.Namespace)
	resolution := coalesce(misconfig.Resolution)

	return console.StackPolicyViolationAttributes{
		Severity:     in.toSeverity(misconfig.Severity),
		PolicyID:     misconfig.ID,
		PolicyURL:    lo.ToPtr(policyURL),
		PolicyModule: lo.ToPtr(policyModule),
		Title:        misconfig.Title,
		Description:  lo.ToPtr(desc),
		Resolution:   lo.ToPtr(resolution),
		Causes:       lo.Ternary(len(misconfig.CauseMetadata.Code.Lines) == 0, nil, in.toStackViolationCauseAttributes(target, misconfig.CauseMetadata)),
	}
}

func (in *Report) toSeverity(severity string) console.VulnSeverity {
	switch severity {
	case "CRITICAL":
		return console.VulnSeverityCritical
	case "HIGH":
		return console.VulnSeverityHigh
	case "MEDIUM":
		return console.VulnSeverityMedium
	case "LOW":
		return console.VulnSeverityLow
	default:
		return console.VulnSeverityUnknown
	}
}

func (in *Report) toStackViolationCauseAttributes(target string, cause ftypes.CauseMetadata) []*console.StackViolationCauseAttributes {
	return []*console.StackViolationCauseAttributes{
		{
			Resource: cause.Resource,
			Start:    int64(cause.StartLine),
			End:      int64(cause.EndLine),
			Lines:    in.toStackViolationCauseLineAttributes(cause.Code),
			Filename: lo.ToPtr(target),
		},
	}
}

func (in *Report) toStackViolationCauseLineAttributes(code ftypes.Code) []*console.StackViolationCauseLineAttributes {
	return lo.ToSlicePtr(algorithms.Map(code.Lines, func(line ftypes.Line) console.StackViolationCauseLineAttributes {
		return console.StackViolationCauseLineAttributes{
			Content: lo.Ternary(len(line.Content) == 0, "..", line.Content),
			Line:    int64(line.Number),
			First:   lo.ToPtr(line.FirstCause),
			Last:    lo.ToPtr(line.LastCause),
		}
	}))
}
