package client

import (
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
)

// The REST ingest payloads mirror the console's schemas, with snake_case keys and lowercase enum values.

type vulnerabilityReport struct {
	ArtifactURL             *string               `json:"artifact_url,omitempty"`
	ArtifactRepoURL         *string               `json:"artifact_repo_url,omitempty"`
	ArtifactLanguage        *string               `json:"artifact_language,omitempty"`
	ArtifactLanguageVersion *string               `json:"artifact_language_version,omitempty"`
	AgentRuntime            *string               `json:"agent_runtime,omitempty"`
	Os                      *vulnerabilityOs      `json:"os,omitempty"`
	Summary                 *vulnerabilitySummary `json:"summary,omitempty"`
	Artifact                *vulnerableArtifact   `json:"artifact,omitempty"`
	Vulnerabilities         []vulnerability       `json:"vulnerabilities,omitempty"`
	Services                []serviceVuln         `json:"services,omitempty"`
	Namespaces              []namespaceVuln       `json:"namespaces,omitempty"`
}

type vulnerabilityOs struct {
	Eosl   *bool   `json:"eosl,omitempty"`
	Family *string `json:"family,omitempty"`
	Name   *string `json:"name,omitempty"`
}

type vulnerabilitySummary struct {
	CriticalCount *int64 `json:"critical_count,omitempty"`
	HighCount     *int64 `json:"high_count,omitempty"`
	MediumCount   *int64 `json:"medium_count,omitempty"`
	LowCount      *int64 `json:"low_count,omitempty"`
	NoneCount     *int64 `json:"none_count,omitempty"`
}

type vulnerableArtifact struct {
	Registry   *string `json:"registry,omitempty"`
	Repository *string `json:"repository,omitempty"`
	Digest     *string `json:"digest,omitempty"`
	Tag        *string `json:"tag,omitempty"`
	Mime       *string `json:"mime,omitempty"`
}

type vulnerability struct {
	Resource         *string     `json:"resource,omitempty"`
	FixedVersion     *string     `json:"fixed_version,omitempty"`
	InstalledVersion *string     `json:"installed_version,omitempty"`
	Severity         *string     `json:"severity,omitempty"`
	Score            *float64    `json:"score,omitempty"`
	RepositoryURL    *string     `json:"repository_url,omitempty"`
	AgentRuntime     *string     `json:"agent_runtime,omitempty"`
	Title            *string     `json:"title,omitempty"`
	Description      *string     `json:"description,omitempty"`
	CvssSource       *string     `json:"cvss_source,omitempty"`
	PrimaryLink      *string     `json:"primary_link,omitempty"`
	Links            []string    `json:"links,omitempty"`
	Target           *string     `json:"target,omitempty"`
	Class            *string     `json:"class,omitempty"`
	PackageType      *string     `json:"package_type,omitempty"`
	PkgPath          *string     `json:"pkg_path,omitempty"`
	VulnID           *string     `json:"vuln_id,omitempty"`
	PublishedDate    *string     `json:"published_date,omitempty"`
	LastModifiedDate *string     `json:"last_modified_date,omitempty"`
	Cvss             *cvssBundle `json:"cvss,omitempty"`
}

type cvssBundle struct {
	Nvidia *cvss `json:"nvidia,omitempty"`
	Redhat *cvss `json:"redhat,omitempty"`
}

type cvss struct {
	V2Vector  *string  `json:"v2_vector,omitempty"`
	V3Vector  *string  `json:"v3_vector,omitempty"`
	V40Vector *string  `json:"v40_vector,omitempty"`
	V2Score   *float64 `json:"v2_score,omitempty"`
	V3Score   *float64 `json:"v3_score,omitempty"`
	V40Score  *float64 `json:"v40_score,omitempty"`
}

type serviceVuln struct {
	ServiceID string `json:"service_id"`
}

type namespaceVuln struct {
	Namespace string `json:"namespace"`
}

type policyConstraint struct {
	Name           string         `json:"name"`
	Description    *string        `json:"description,omitempty"`
	Recommendation *string        `json:"recommendation,omitempty"`
	ViolationCount *int64         `json:"violation_count,omitempty"`
	Enforcement    *string        `json:"enforcement,omitempty"`
	Ref            *constraintRef `json:"ref,omitempty"`
	Violations     []violation    `json:"violations,omitempty"`
}

type constraintRef struct {
	Kind string `json:"kind"`
	Name string `json:"name"`
}

type violation struct {
	Group     *string `json:"group,omitempty"`
	Version   *string `json:"version,omitempty"`
	Kind      *string `json:"kind,omitempty"`
	Namespace *string `json:"namespace,omitempty"`
	Name      *string `json:"name,omitempty"`
	Message   *string `json:"message,omitempty"`
}

// Top-level keys are always sent, null if unset, as the console applies every key that's present.
type serviceComponentsUpdate struct {
	Components []component      `json:"components"`
	RevisionID string           `json:"revision_id"`
	Sha        *string          `json:"sha"`
	Errors     []serviceError   `json:"errors"`
	Metadata   *serviceMetadata `json:"metadata"`
}

type component struct {
	State     *string           `json:"state,omitempty"`
	Synced    bool              `json:"synced"`
	Group     string            `json:"group"`
	Version   string            `json:"version"`
	Kind      string            `json:"kind"`
	Namespace string            `json:"namespace"`
	Name      string            `json:"name"`
	UID       *string           `json:"uid,omitempty"`
	Content   *componentContent `json:"content,omitempty"`
	Children  []componentChild  `json:"children,omitempty"`
}

type componentContent struct {
	Desired *string `json:"desired,omitempty"`
	Live    *string `json:"live,omitempty"`
}

type componentChild struct {
	UID       string  `json:"uid"`
	State     *string `json:"state,omitempty"`
	ParentUID *string `json:"parent_uid,omitempty"`
	Name      string  `json:"name"`
	Namespace *string `json:"namespace,omitempty"`
	Group     *string `json:"group,omitempty"`
	Version   string  `json:"version"`
	Kind      string  `json:"kind"`
}

type serviceError struct {
	Source  string `json:"source"`
	Message string `json:"message"`
	Warning *bool  `json:"warning,omitempty"`
}

type serviceMetadata struct {
	Images []string `json:"images,omitempty"`
	Fqdns  []string `json:"fqdns,omitempty"`
}

type costIngest struct {
	Cluster         *cost                   `json:"cluster,omitempty"`
	Namespaces      []cost                  `json:"namespaces,omitempty"`
	Recommendations []scalingRecommendation `json:"recommendations,omitempty"`
}

type cost struct {
	Namespace        *string  `json:"namespace,omitempty"`
	Memory           *float64 `json:"memory,omitempty"`
	CPU              *float64 `json:"cpu,omitempty"`
	Gpu              *float64 `json:"gpu,omitempty"`
	Storage          *float64 `json:"storage,omitempty"`
	MemoryUtil       *float64 `json:"memory_util,omitempty"`
	CPUUtil          *float64 `json:"cpu_util,omitempty"`
	GpuUtil          *float64 `json:"gpu_util,omitempty"`
	CPUCost          *float64 `json:"cpu_cost,omitempty"`
	MemoryCost       *float64 `json:"memory_cost,omitempty"`
	GpuCost          *float64 `json:"gpu_cost,omitempty"`
	IngressCost      *float64 `json:"ingress_cost,omitempty"`
	LoadBalancerCost *float64 `json:"load_balancer_cost,omitempty"`
	EgressCost       *float64 `json:"egress_cost,omitempty"`
	NodeCost         *float64 `json:"node_cost,omitempty"`
	ControlPlaneCost *float64 `json:"control_plane_cost,omitempty"`
	StorageCost      *float64 `json:"storage_cost,omitempty"`
}

type scalingRecommendation struct {
	Type          *string  `json:"type,omitempty"`
	Namespace     *string  `json:"namespace,omitempty"`
	Name          *string  `json:"name,omitempty"`
	Container     *string  `json:"container,omitempty"`
	CPUUtil       *float64 `json:"cpu_util,omitempty"`
	GpuUtil       *float64 `json:"gpu_util,omitempty"`
	MemoryUtil    *float64 `json:"memory_util,omitempty"`
	MemoryRequest *float64 `json:"memory_request,omitempty"`
	CPURequest    *float64 `json:"cpu_request,omitempty"`
	CPUCost       *float64 `json:"cpu_cost,omitempty"`
	MemoryCost    *float64 `json:"memory_cost,omitempty"`
	GpuCost       *float64 `json:"gpu_cost,omitempty"`
	ServiceID     *string  `json:"service_id,omitempty"`
}

func toServiceComponentsUpdate(components []*console.ComponentAttributes, revisionID string, sha *string, errs []*console.ServiceErrorAttributes, metadata *console.ServiceMetadataAttributes) serviceComponentsUpdate {
	return serviceComponentsUpdate{
		Components: convertSlice(components, toComponent),
		RevisionID: revisionID,
		Sha:        sha,
		Errors: convertSlice(errs, func(e *console.ServiceErrorAttributes) serviceError {
			return serviceError{Source: e.Source, Message: e.Message, Warning: e.Warning}
		}),
		Metadata: convertPtr(metadata, func(m *console.ServiceMetadataAttributes) serviceMetadata {
			return serviceMetadata{Images: lo.FromSlicePtr(lo.Compact(m.Images)), Fqdns: lo.FromSlicePtr(lo.Compact(m.Fqdns))}
		}),
	}
}

func toComponent(in *console.ComponentAttributes) component {
	return component{
		State:     lowerEnum(in.State),
		Synced:    in.Synced,
		Group:     in.Group,
		Version:   in.Version,
		Kind:      in.Kind,
		Namespace: in.Namespace,
		Name:      in.Name,
		UID:       in.UID,
		Content: convertPtr(in.Content, func(c *console.ComponentContentAttributes) componentContent {
			return componentContent{Desired: c.Desired, Live: c.Live}
		}),
		Children: convertSlice(in.Children, func(c *console.ComponentChildAttributes) componentChild {
			return componentChild{
				UID:       c.UID,
				State:     lowerEnum(c.State),
				ParentUID: c.ParentUID,
				Name:      c.Name,
				Namespace: c.Namespace,
				Group:     c.Group,
				Version:   c.Version,
				Kind:      c.Kind,
			}
		}),
	}
}

func toCostIngest(in console.CostIngestAttributes) costIngest {
	return costIngest{
		Cluster:    convertPtr(in.Cluster, toCost),
		Namespaces: convertSlice(in.Namespaces, toCost),
		Recommendations: convertSlice(in.Recommendations, func(r *console.ClusterRecommendationAttributes) scalingRecommendation {
			return scalingRecommendation{
				Type:          lowerEnum(r.Type),
				Namespace:     r.Namespace,
				Name:          r.Name,
				Container:     r.Container,
				CPUUtil:       r.CPUUtil,
				GpuUtil:       r.GpuUtil,
				MemoryUtil:    r.MemoryUtil,
				MemoryRequest: r.MemoryRequest,
				CPURequest:    r.CPURequest,
				CPUCost:       r.CPUCost,
				MemoryCost:    r.MemoryCost,
				GpuCost:       r.GpuCost,
				ServiceID:     r.ServiceID,
			}
		}),
	}
}

func toCost(in *console.CostAttributes) cost {
	return cost{
		Namespace:        in.Namespace,
		Memory:           in.Memory,
		CPU:              in.CPU,
		Gpu:              in.Gpu,
		Storage:          in.Storage,
		MemoryUtil:       in.MemoryUtil,
		CPUUtil:          in.CPUUtil,
		GpuUtil:          in.GpuUtil,
		CPUCost:          in.CPUCost,
		MemoryCost:       in.MemoryCost,
		GpuCost:          in.GpuCost,
		IngressCost:      in.IngressCost,
		LoadBalancerCost: in.LoadBalancerCost,
		EgressCost:       in.EgressCost,
		NodeCost:         in.NodeCost,
		ControlPlaneCost: in.ControlPlaneCost,
		StorageCost:      in.StorageCost,
	}
}

func toVulnerabilityReports(in []*console.VulnerabilityReportAttributes) []vulnerabilityReport {
	return lo.FilterMap(in, func(r *console.VulnerabilityReportAttributes, _ int) (vulnerabilityReport, bool) {
		if r == nil {
			return vulnerabilityReport{}, false
		}

		return vulnerabilityReport{
			ArtifactURL:             r.ArtifactURL,
			ArtifactRepoURL:         r.ArtifactRepoURL,
			ArtifactLanguage:        lowerEnum(r.ArtifactLanguage),
			ArtifactLanguageVersion: r.ArtifactLanguageVersion,
			AgentRuntime:            r.AgentRuntime,
			Os:                      convertPtr(r.Os, toVulnerabilityOs),
			Summary:                 convertPtr(r.Summary, toVulnerabilitySummary),
			Artifact:                convertPtr(r.Artifact, toVulnerableArtifact),
			Vulnerabilities:         convertSlice(r.Vulnerabilities, toVulnerability),
			Services: convertSlice(r.Services, func(s *console.ServiceVulnAttributes) serviceVuln {
				return serviceVuln{ServiceID: s.ServiceID}
			}),
			Namespaces: convertSlice(r.Namespaces, func(n *console.NamespaceVulnAttributes) namespaceVuln {
				return namespaceVuln{Namespace: n.Namespace}
			}),
		}, true
	})
}

func toVulnerabilityOs(in *console.VulnOsAttributes) vulnerabilityOs {
	return vulnerabilityOs{Eosl: in.Eosl, Family: in.Family, Name: in.Name}
}

func toVulnerabilitySummary(in *console.VulnSummaryAttributes) vulnerabilitySummary {
	return vulnerabilitySummary{
		CriticalCount: in.CriticalCount,
		HighCount:     in.HighCount,
		MediumCount:   in.MediumCount,
		LowCount:      in.LowCount,
		NoneCount:     in.NoneCount,
	}
}

func toVulnerableArtifact(in *console.VulnArtifactAttributes) vulnerableArtifact {
	return vulnerableArtifact{Registry: in.Registry, Repository: in.Repository, Digest: in.Digest, Tag: in.Tag, Mime: in.Mime}
}

func toVulnerability(in *console.VulnerabilityAttributes) vulnerability {
	return vulnerability{
		Resource:         in.Resource,
		FixedVersion:     in.FixedVersion,
		InstalledVersion: in.InstalledVersion,
		Severity:         lowerEnum(in.Severity),
		Score:            in.Score,
		RepositoryURL:    in.RepositoryURL,
		AgentRuntime:     in.AgentRuntime,
		Title:            in.Title,
		Description:      in.Description,
		CvssSource:       in.CvssSource,
		PrimaryLink:      in.PrimaryLink,
		Links:            lo.FromSlicePtr(lo.Compact(in.Links)),
		Target:           in.Target,
		Class:            in.Class,
		PackageType:      in.PackageType,
		PkgPath:          in.PkgPath,
		VulnID:           in.VulnID,
		PublishedDate:    in.PublishedDate,
		LastModifiedDate: in.LastModifiedDate,
		Cvss: convertPtr(in.Cvss, func(b *console.CvssBundleAttributes) cvssBundle {
			return cvssBundle{Nvidia: convertPtr(b.Nvidia, toCvss), Redhat: convertPtr(b.Redhat, toCvss)}
		}),
	}
}

func toCvss(in *console.CvssAttributes) cvss {
	return cvss{
		V2Vector:  in.V2Vector,
		V3Vector:  in.V3Vector,
		V40Vector: in.V40Vector,
		V2Score:   in.V2Score,
		V3Score:   in.V3Score,
		V40Score:  in.V40Score,
	}
}

func toPolicyConstraints(in []console.PolicyConstraintAttributes) []policyConstraint {
	return lo.Map(in, func(c console.PolicyConstraintAttributes, _ int) policyConstraint {
		return policyConstraint{
			Name:           c.Name,
			Description:    c.Description,
			Recommendation: c.Recommendation,
			ViolationCount: c.ViolationCount,
			Enforcement:    lowerEnum(c.Enforcement),
			Ref: convertPtr(c.Ref, func(r *console.ConstraintRefAttributes) constraintRef {
				return constraintRef{Kind: r.Kind, Name: r.Name}
			}),
			Violations: convertSlice(c.Violations, func(v *console.ViolationAttributes) violation {
				return violation{Group: v.Group, Version: v.Version, Kind: v.Kind, Namespace: v.Namespace, Name: v.Name, Message: v.Message}
			}),
		}
	})
}

func lowerEnum[T ~string](v *T) *string {
	if v == nil {
		return nil
	}
	return lo.ToPtr(strings.ToLower(string(*v)))
}

func convertPtr[T, R any](in *T, f func(*T) R) *R {
	if in == nil {
		return nil
	}
	return lo.ToPtr(f(in))
}

// convertSlice keeps nil slices nil, as some endpoints treat null and empty lists differently.
func convertSlice[T, R any](in []*T, f func(*T) R) []R {
	if in == nil {
		return nil
	}

	return lo.FilterMap(in, func(v *T, _ int) (R, bool) {
		if v == nil {
			var zero R
			return zero, false
		}
		return f(v), true
	})
}
