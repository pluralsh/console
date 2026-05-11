package v1

import (
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
)

var (
	severityToNumber = map[console.VulnSeverity]int{
		console.VulnSeverityNone:     0,
		console.VulnSeverityUnknown:  0,
		console.VulnSeverityLow:      1,
		console.VulnSeverityMedium:   2,
		console.VulnSeverityHigh:     3,
		console.VulnSeverityCritical: 4,
	}
)

func MaxSeverity(violations []*console.StackPolicyViolationAttributes) int {
	result := -1
	for _, violation := range violations {
		result = algorithms.Max(result, SeverityInt(violation.Severity))
	}

	return result
}

func SeverityInt(severity console.VulnSeverity) int {
	return severityToNumber[severity]
}
