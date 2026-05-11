package common_test

import (
	"os"
	"path/filepath"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	deploymentsv1alpha1 "github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/common"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ = Describe("Health Test", Ordered, func() {
	Context("Test health functions", func() {
		customResource := &deploymentsv1alpha1.MetricsAggregate{
			ObjectMeta: metav1.ObjectMeta{
				Name: "test",
			},
		}

		It("should get default status from CRD without condition block", func() {
			obj, err := common.ToUnstructured(customResource)
			Expect(err).NotTo(HaveOccurred())
			status, err := common.GetResourceHealth(obj)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).To(Not(BeNil()))
			Expect(*status).To(Equal(common.HealthStatus{
				Status: common.HealthStatusHealthy,
			}))
		})
		It("should get healthy status from CRD with condition block", func() {
			customResource.Status = deploymentsv1alpha1.MetricsAggregateStatus{
				Conditions: []metav1.Condition{
					{
						Type:   "Ready",
						Status: "True",
					},
				},
			}
			obj, err := common.ToUnstructured(customResource)
			Expect(err).NotTo(HaveOccurred())
			status, err := common.GetResourceHealth(obj)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).To(Not(BeNil()))
			Expect(*status).To(Equal(common.HealthStatus{
				Status: common.HealthStatusHealthy,
			}))
		})

		It("should get progressing status from CRD with condition block", func() {
			customResource.Status = deploymentsv1alpha1.MetricsAggregateStatus{
				Conditions: []metav1.Condition{
					{
						Type:               "Ready",
						Status:             "False",
						LastTransitionTime: metav1.Now(),
					},
				},
			}
			obj, err := common.ToUnstructured(customResource)
			Expect(err).NotTo(HaveOccurred())
			status, err := common.GetResourceHealth(obj)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).To(Not(BeNil()))
			Expect(*status).To(Equal(common.HealthStatus{
				Status: common.HealthStatusProgressing,
			}))
		})

		It("should get degraded status from CRD with condition block", func() {
			sixMinutesAgo := metav1.NewTime(time.Now().Add(-6 * time.Minute))
			customResource.Status = deploymentsv1alpha1.MetricsAggregateStatus{
				Conditions: []metav1.Condition{
					{
						Type:               "Ready",
						Status:             "False",
						LastTransitionTime: sixMinutesAgo,
					},
				},
			}
			obj, err := common.ToUnstructured(customResource)
			obj.SetAPIVersion("deployments.plural.sh/v1alpha1")
			obj.SetKind("MetricsAggregate")
			Expect(err).NotTo(HaveOccurred())
			status, err := common.GetResourceHealth(obj)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).To(Not(BeNil()))
			Expect(*status).To(Equal(common.HealthStatus{
				Status: common.HealthStatusDegraded,
			}))
		})

		It("should get HealthStatusProgressing status during deletion", func() {
			customResource.DeletionTimestamp = &metav1.Time{
				Time: time.Now(),
			}
			obj, err := common.ToUnstructured(customResource)
			Expect(err).NotTo(HaveOccurred())
			status, err := common.GetResourceHealth(obj)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).To(Not(BeNil()))
			Expect(*status).To(Equal(common.HealthStatus{
				Status:  common.HealthStatusProgressing,
				Message: "Pending deletion",
			}))
		})

		It("should get status from Lua script", func() {
			customResource.DeletionTimestamp = nil
			obj, err := common.ToUnstructured(customResource)
			Expect(err).NotTo(HaveOccurred())
			scriptPath := filepath.Join("..", "..", "test", "lua", "test.lua")
			script, err := os.ReadFile(scriptPath)
			Expect(err).NotTo(HaveOccurred())
			common.GetLuaScript().SetValue(string(script))
			status, err := common.GetResourceHealth(obj)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).To(Not(BeNil()))
			Expect(*status).To(Equal(common.HealthStatus{
				Status: common.HealthStatusProgressing,
			}))
		})

	})
})
