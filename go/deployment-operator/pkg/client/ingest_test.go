package client

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gqlgo/gqlgenc/clientv2"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type ingestConsoleClient struct {
	console.ConsoleClient
	upsertedVulns       int
	upsertedConstraints int
	updatedComponents   int
	ingestedCosts       int
}

func (c *ingestConsoleClient) UpdateServiceComponents(_ context.Context, _ string, _ []*console.ComponentAttributes, _ string, _ *string, _ []*console.ServiceErrorAttributes, _ *console.ServiceMetadataAttributes, _ ...clientv2.RequestInterceptor) (*console.UpdateServiceComponents, error) {
	c.updatedComponents++
	return &console.UpdateServiceComponents{}, nil
}

func (c *ingestConsoleClient) IngestClusterCost(_ context.Context, _ console.CostIngestAttributes, _ ...clientv2.RequestInterceptor) (*console.IngestClusterCost, error) {
	c.ingestedCosts++
	return &console.IngestClusterCost{}, nil
}

func (c *ingestConsoleClient) UpsertVulnerabilities(_ context.Context, _ []*console.VulnerabilityReportAttributes, _ ...clientv2.RequestInterceptor) (*console.UpsertVulnerabilities, error) {
	c.upsertedVulns++
	return &console.UpsertVulnerabilities{UpsertVulnerabilities: lo.ToPtr(int64(1))}, nil
}

func (c *ingestConsoleClient) UpsertPolicyConstraints(_ context.Context, _ []*console.PolicyConstraintAttributes, _ ...clientv2.RequestInterceptor) (*console.UpsertPolicyConstraints, error) {
	c.upsertedConstraints++
	return &console.UpsertPolicyConstraints{UpsertPolicyConstraints: lo.ToPtr(int64(1))}, nil
}

func newIngestClient(t *testing.T, handler http.HandlerFunc) (*client, *ingestConsoleClient) {
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	fake := &ingestConsoleClient{}
	return &client{ctx: context.Background(), consoleClient: fake, url: srv.URL + "/ext/gql", token: "deploy-token"}, fake
}

var (
	testReports = []*console.VulnerabilityReportAttributes{{
		ArtifactURL:      lo.ToPtr("nginx:latest"),
		ArtifactLanguage: lo.ToPtr(console.AgentRunLanguagePython),
		Summary:          &console.VulnSummaryAttributes{HighCount: lo.ToPtr(int64(1))},
		Services:         []*console.ServiceVulnAttributes{{ServiceID: "svc-id"}},
		Vulnerabilities: []*console.VulnerabilityAttributes{{
			Resource: lo.ToPtr("openssl"),
			Severity: lo.ToPtr(console.VulnSeverityHigh),
			Links:    []*string{lo.ToPtr("a.example.com"), nil},
			Cvss:     &console.CvssBundleAttributes{Nvidia: &console.CvssAttributes{V3Score: lo.ToPtr(9.8)}},
		}, nil},
	}, nil}

	testConstraints = []console.PolicyConstraintAttributes{{
		Name:        "require-labels",
		Enforcement: lo.ToPtr(console.ConstraintEnforcementDryRun),
		Ref:         &console.ConstraintRefAttributes{Kind: "K8sRequiredLabels", Name: "require-labels"},
		Violations:  []*console.ViolationAttributes{{Kind: lo.ToPtr("Pod"), Message: lo.ToPtr("missing label")}},
	}}
)

func TestUpsertVulnerabilityReports(t *testing.T) {
	t.Run("posts the reports to the ingest endpoint", func(t *testing.T) {
		var sent map[string]any
		c, fake := newIngestClient(t, func(w http.ResponseWriter, r *http.Request) {
			assert.Equal(t, http.MethodPost, r.Method)
			assert.Equal(t, "/ext/v1/vulnerabilities", r.URL.Path)
			assert.Equal(t, "Token deploy-token", r.Header.Get("Authorization"))
			assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
			require.NoError(t, json.NewDecoder(r.Body).Decode(&sent))
			_, _ = w.Write([]byte(`{"count": 1}`))
		})

		res, err := c.UpsertVulnerabilityReports(testReports)
		require.NoError(t, err)
		assert.Equal(t, int64(1), *res.UpsertVulnerabilities)
		assert.Zero(t, fake.upsertedVulns)

		assert.JSONEq(t, `{"reports": [{
			"artifact_url": "nginx:latest",
			"artifact_language": "python",
			"summary": {"high_count": 1},
			"services": [{"service_id": "svc-id"}],
			"vulnerabilities": [{
				"resource": "openssl",
				"severity": "high",
				"links": ["a.example.com"],
				"cvss": {"nvidia": {"v3_score": 9.8}}
			}]
		}]}`, string(lo.Must(json.Marshal(sent))))
	})

	t.Run("falls back to the graphql mutations on consoles without the endpoints", func(t *testing.T) {
		calls := 0
		c, fake := newIngestClient(t, func(w http.ResponseWriter, _ *http.Request) {
			calls++
			w.WriteHeader(http.StatusNotFound)
		})

		for range 2 {
			_, err := c.UpsertVulnerabilityReports(testReports)
			require.NoError(t, err)
			_, err = c.UpsertConstraints(testConstraints)
			require.NoError(t, err)
			require.NoError(t, c.UpdateComponents("svc-id", "rev-id", nil, testComponents, nil, nil))
			_, err = c.IngestClusterCost(testCosts)
			require.NoError(t, err)
		}

		assert.Equal(t, 1, calls)
		assert.Equal(t, 2, fake.upsertedVulns)
		assert.Equal(t, 2, fake.upsertedConstraints)
		assert.Equal(t, 2, fake.updatedComponents)
		assert.Equal(t, 2, fake.ingestedCosts)
		assert.True(t, c.legacyIngest.Load())
	})

	t.Run("other errors are passed on without falling back", func(t *testing.T) {
		c, fake := newIngestClient(t, func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = w.Write([]byte(`{"error": "invalid severity"}`))
		})

		_, err := c.UpsertVulnerabilityReports(testReports)
		require.ErrorContains(t, err, "status 422")
		assert.Zero(t, fake.upsertedVulns)
		assert.False(t, c.legacyIngest.Load())
	})
}

func TestUpdateComponents(t *testing.T) {
	var sent map[string]any
	c, fake := newIngestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/ext/v1/services/svc-id/components", r.URL.Path)
		require.NoError(t, json.NewDecoder(r.Body).Decode(&sent))
		_, _ = w.Write([]byte(`{"id": "svc-id"}`))
	})

	require.NoError(t, c.UpdateComponents("svc-id", "", nil, testComponents, nil, nil))
	assert.Zero(t, fake.updatedComponents)

	// unlike null, an empty list of errors clears the service's errors
	var cleared map[string]any
	require.NoError(t, json.Unmarshal(lo.Must(json.Marshal(toServiceComponentsUpdate(nil, "", nil, []*console.ServiceErrorAttributes{}, nil))), &cleared))
	assert.Equal(t, []any{}, cleared["errors"])
	assert.Nil(t, cleared["components"])

	assert.JSONEq(t, `{
		"revision_id": "",
		"sha": null,
		"errors": null,
		"metadata": null,
		"components": [{
			"state": "running",
			"synced": true,
			"group": "",
			"version": "v1",
			"kind": "Pod",
			"namespace": "default",
			"name": "nginx",
			"content": {"desired": "kind: Pod"},
			"children": [{"uid": "c-uid", "name": "child", "version": "v1", "kind": "Event", "state": "pending"}]
		}]
	}`, string(lo.Must(json.Marshal(sent))))
}

func TestIngestClusterCost(t *testing.T) {
	var sent map[string]any
	c, fake := newIngestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/ext/v1/costs", r.URL.Path)
		require.NoError(t, json.NewDecoder(r.Body).Decode(&sent))
		_, _ = w.Write([]byte(`{"ingested": true}`))
	})

	res, err := c.IngestClusterCost(testCosts)
	require.NoError(t, err)
	assert.True(t, *res.IngestClusterCost)
	assert.Zero(t, fake.ingestedCosts)

	assert.JSONEq(t, `{
		"cluster": {"cpu": 1, "memory_util": 0.5},
		"namespaces": [{"namespace": "default", "cpu_cost": 2.5}],
		"recommendations": [{"type": "statefulset", "name": "db", "cpu_util": 0.25, "service_id": "svc-id"}]
	}`, string(lo.Must(json.Marshal(sent))))
}

var (
	testComponents = []*console.ComponentAttributes{{
		State:     lo.ToPtr(console.ComponentStateRunning),
		Synced:    true,
		Version:   "v1",
		Kind:      "Pod",
		Namespace: "default",
		Name:      "nginx",
		Content:   &console.ComponentContentAttributes{Desired: lo.ToPtr("kind: Pod")},
		Children: []*console.ComponentChildAttributes{{
			UID: "c-uid", Name: "child", Version: "v1", Kind: "Event", State: lo.ToPtr(console.ComponentStatePending),
		}, nil},
	}}

	testCosts = console.CostIngestAttributes{
		Cluster:    &console.CostAttributes{CPU: lo.ToPtr(1.0), MemoryUtil: lo.ToPtr(0.5)},
		Namespaces: []*console.CostAttributes{{Namespace: lo.ToPtr("default"), CPUCost: lo.ToPtr(2.5)}},
		Recommendations: []*console.ClusterRecommendationAttributes{{
			Type:      lo.ToPtr(console.ScalingRecommendationTypeStatefulset),
			Name:      lo.ToPtr("db"),
			CPUUtil:   lo.ToPtr(0.25),
			ServiceID: lo.ToPtr("svc-id"),
		}},
	}
)

func TestUpsertConstraints(t *testing.T) {
	var sent map[string]any
	c, fake := newIngestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/ext/v1/constraints", r.URL.Path)
		require.NoError(t, json.NewDecoder(r.Body).Decode(&sent))
		_, _ = w.Write([]byte(`{"count": 1}`))
	})

	res, err := c.UpsertConstraints(testConstraints)
	require.NoError(t, err)
	assert.Equal(t, int64(1), *res.UpsertPolicyConstraints)
	assert.Zero(t, fake.upsertedConstraints)

	assert.JSONEq(t, `{"constraints": [{
		"name": "require-labels",
		"enforcement": "dry_run",
		"ref": {"kind": "K8sRequiredLabels", "name": "require-labels"},
		"violations": [{"kind": "Pod", "message": "missing label"}]
	}]}`, string(lo.Must(json.Marshal(sent))))
}
