package terraform

// InfracostReport represents the top-level structure of infracost JSON output.
type InfracostReport struct {
	Version          string             `json:"version"`
	Currency         string             `json:"currency"`
	Projects         []InfracostProject `json:"projects"`
	TotalHourlyCost  *string            `json:"totalHourlyCost"`
	TotalMonthlyCost *string            `json:"totalMonthlyCost"`
}

// InfracostProject represents a single project in the infracost output.
type InfracostProject struct {
	Name          string              `json:"name"`
	Metadata      InfracostMetadata   `json:"metadata"`
	Breakdown     *InfracostBreakdown `json:"breakdown"`
	Diff          *InfracostBreakdown `json:"diff"`
	PastBreakdown *InfracostBreakdown `json:"pastBreakdown"`
}

// InfracostMetadata contains metadata about the project.
type InfracostMetadata struct {
	Path      string `json:"path"`
	Type      string `json:"type"`
	Workspace string `json:"workspace"`
}

// InfracostBreakdown contains cost breakdown information.
type InfracostBreakdown struct {
	Resources        []InfracostResource `json:"resources"`
	TotalHourlyCost  *string             `json:"totalHourlyCost"`
	TotalMonthlyCost *string             `json:"totalMonthlyCost"`
}

// InfracostResource represents a single resource in the cost breakdown.
type InfracostResource struct {
	Name           string                   `json:"name"`
	ResourceType   string                   `json:"resourceType"`
	Tags           map[string]string        `json:"tags"`
	Metadata       map[string]interface{}   `json:"metadata"`
	HourlyCost     *string                  `json:"hourlyCost"`
	MonthlyCost    *string                  `json:"monthlyCost"`
	CostComponents []InfracostCostComponent `json:"costComponents"`
	SubResources   []InfracostResource      `json:"subresources"`
}

// InfracostCostComponent represents a cost component of a resource.
type InfracostCostComponent struct {
	Name            string  `json:"name"`
	Unit            string  `json:"unit"`
	HourlyQuantity  *string `json:"hourlyQuantity"`
	MonthlyQuantity *string `json:"monthlyQuantity"`
	Price           string  `json:"price"`
	HourlyCost      *string `json:"hourlyCost"`
	MonthlyCost     *string `json:"monthlyCost"`
}

// InfracostResourceScope represents the scope of an infracost resource.
type InfracostResourceScope string

const (
	InfracostResourceScopeBreakdown     InfracostResourceScope = "breakdown"
	InfracostResourceScopePastBreakdown InfracostResourceScope = "past_breakdown"
	InfracostResourceScopeDiff          InfracostResourceScope = "diff"
)
