package controller_test

import (
	"strings"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"helm.sh/helm/v3/pkg/chart"
	rbacv1 "k8s.io/api/rbac/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/sets"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/console/go/helm-test/internal/common"
)

const (
	controllerChartPath = "../../../../charts/controller"
	deploymentsAPIGroup = "deployments.plural.sh"
)

var managerRoleKey = common.ManifestKey{
	Name: "console-operator-manager-role",
	GroupKind: schema.GroupKind{
		Group: "rbac.authorization.k8s.io",
		Kind:  "ClusterRole",
	},
}

var _ = Describe("RBAC", func() {
	It("explicitly enumerates all resources and verbs", func() {
		chart, manifests := renderControllerChart(nil)
		role := managerRole(manifests)

		for _, manifest := range manifests {
			if manifest.GetKind() != "Role" && manifest.GetKind() != "ClusterRole" {
				continue
			}

			for _, rule := range policyRules(manifest) {
				Expect(rule.Resources).NotTo(ContainElement("*"))
				Expect(rule.Verbs).NotTo(ContainElement("*"))
			}
		}

		resources := crdResources(chart.CRDObjects())
		Expect(ruleFor(role.Rules, "").Resources).To(ConsistOf(resources))
		Expect(ruleFor(role.Rules, "").Verbs).To(ConsistOf(
			"create",
			"delete",
			"deletecollection",
			"get",
			"list",
			"patch",
			"update",
			"watch",
		))
		Expect(ruleFor(role.Rules, "/finalizers").Resources).To(ConsistOf(withSuffix(resources, "/finalizers")))
		Expect(ruleFor(role.Rules, "/finalizers").Verbs).To(ConsistOf("update"))
		Expect(ruleFor(role.Rules, "/status").Resources).To(ConsistOf(withSuffix(resources, "/status")))
		Expect(ruleFor(role.Rules, "/status").Verbs).To(ConsistOf("get", "patch", "update"))
	})

	It("allows explicit RBAC resources and verbs to be configured", func() {
		_, manifests := renderControllerChart(map[string]interface{}{
			"rbac": map[string]interface{}{
				"deploymentsPlural": map[string]interface{}{
					"resources": []string{"widgets"},
					"verbs":     []string{"get", "list"},
				},
			},
		})
		role := managerRole(manifests)

		Expect(ruleFor(role.Rules, "").Resources).To(ConsistOf("widgets"))
		Expect(ruleFor(role.Rules, "").Verbs).To(ConsistOf("get", "list"))
		Expect(ruleFor(role.Rules, "/finalizers").Resources).To(ConsistOf("widgets/finalizers"))
		Expect(ruleFor(role.Rules, "/status").Resources).To(ConsistOf("widgets/status"))
	})

	DescribeTable("rejects RBAC wildcards",
		func(values map[string]interface{}) {
			chart, err := common.LoadChart(common.WithLocalPath(controllerChartPath))
			Expect(err).NotTo(HaveOccurred())

			_, err = common.RenderChart(chart, values)
			Expect(err).To(MatchError(ContainSubstring("wildcards are not allowed")))
		},
		Entry("in resources", map[string]interface{}{
			"rbac": map[string]interface{}{
				"deploymentsPlural": map[string]interface{}{
					"resources": []string{"*"},
				},
			},
		}),
		Entry("in verbs", map[string]interface{}{
			"rbac": map[string]interface{}{
				"deploymentsPlural": map[string]interface{}{
					"verbs": []string{"*"},
				},
			},
		}),
	)
})

func renderControllerChart(values map[string]interface{}) (*chart.Chart, common.ManifestMap) {
	GinkgoHelper()

	loadedChart, err := common.LoadChart(common.WithLocalPath(controllerChartPath))
	Expect(err).NotTo(HaveOccurred())

	manifestList, err := common.RenderChart(loadedChart, values)
	Expect(err).NotTo(HaveOccurred())

	manifests, err := common.NewManifestMap(manifestList)
	Expect(err).NotTo(HaveOccurred())

	return loadedChart, manifests
}

func managerRole(manifests common.ManifestMap) rbacv1.ClusterRole {
	GinkgoHelper()

	rawRole, exists := manifests[managerRoleKey.String()]
	Expect(exists).To(BeTrue())

	var role rbacv1.ClusterRole
	Expect(runtime.DefaultUnstructuredConverter.FromUnstructured(rawRole.UnstructuredContent(), &role)).To(Succeed())

	return role
}

func policyRules(manifest *unstructured.Unstructured) []rbacv1.PolicyRule {
	GinkgoHelper()

	switch manifest.GetKind() {
	case "Role":
		var role rbacv1.Role
		Expect(runtime.DefaultUnstructuredConverter.FromUnstructured(manifest.UnstructuredContent(), &role)).To(Succeed())
		return role.Rules
	case "ClusterRole":
		var role rbacv1.ClusterRole
		Expect(runtime.DefaultUnstructuredConverter.FromUnstructured(manifest.UnstructuredContent(), &role)).To(Succeed())
		return role.Rules
	default:
		return nil
	}
}

func crdResources(objects []chart.CRD) []string {
	GinkgoHelper()

	resources := sets.New[string]()
	for _, object := range objects {
		var definition apiextensionsv1.CustomResourceDefinition
		Expect(yaml.Unmarshal(object.File.Data, &definition)).To(Succeed())
		resources.Insert(definition.Spec.Names.Plural)
	}

	return sets.List(resources)
}

func ruleFor(rules []rbacv1.PolicyRule, suffix string) rbacv1.PolicyRule {
	GinkgoHelper()

	for _, rule := range rules {
		if !sets.New(rule.APIGroups...).Has(deploymentsAPIGroup) {
			continue
		}

		matches := len(rule.Resources) > 0
		for _, resource := range rule.Resources {
			if suffix == "" {
				matches = matches && !strings.Contains(resource, "/")
			} else {
				matches = matches && strings.HasSuffix(resource, suffix)
			}
		}
		if matches {
			return rule
		}
	}

	Fail("could not find deployments.plural.sh RBAC rule for suffix " + suffix)
	return rbacv1.PolicyRule{}
}

func withSuffix(resources []string, suffix string) []string {
	result := make([]string, 0, len(resources))
	for _, resource := range resources {
		result = append(result, resource+suffix)
	}
	return result
}
