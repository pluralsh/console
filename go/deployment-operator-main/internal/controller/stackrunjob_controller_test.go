package controller

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"github.com/vektah/gqlparser/v2/gqlerror"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/Yamashou/gqlgenc/clientv2"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/test/common"
	"github.com/pluralsh/deployment-operator/pkg/test/mocks"
)

var _ = Describe("StackRunJob Controller", Ordered, func() {
	Context("When reconciling a resource", func() {
		const (
			runName      = "stack-test-run"
			namespace    = "default"
			runID        = "test-run-123"
			consoleURL   = "https://console.plural.sh"
			deployToken  = "test-token"
			stackRunName = "stack-test-run-123"
		)

		ctx := context.Background()
		runNamespacedName := types.NamespacedName{Name: runName, Namespace: namespace}

		BeforeAll(func() {
			By("Creating StackRunJob")
			err := kClient.Get(ctx, runNamespacedName, &v1alpha1.StackRunJob{})
			if err != nil {
				Expect(errors.IsNotFound(err)).To(BeTrue(), "Unexpected error getting StackRunJob: %v", err)
				resource := &v1alpha1.StackRunJob{
					ObjectMeta: metav1.ObjectMeta{
						Name:      runName,
						Namespace: namespace,
					},
					Spec: v1alpha1.StackRunJobSpec{
						RunID: runID,
					},
				}
				Expect(kClient.Create(ctx, resource)).To(Succeed())
			}
		})

		AfterAll(func() {
			By("Cleaning up StackRunJob")
			resource := &v1alpha1.StackRunJob{}
			err := kClient.Get(ctx, runNamespacedName, resource)
			if err == nil {
				Expect(kClient.Delete(ctx, resource)).To(Succeed())
			}

			// Clean up job if exists
			job := &batchv1.Job{}
			err = kClient.Get(ctx, runNamespacedName, job)
			if err == nil {
				Expect(kClient.Delete(ctx, job)).To(Succeed())
			}

			// Clean up secret if exists
			secret := &corev1.Secret{}
			err = kClient.Get(ctx, runNamespacedName, secret)
			if err == nil {
				Expect(kClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should create secret and job for StackRunJob", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStackRun", runID).Return(&console.StackRunMinimalFragment{
				ID:     stackRunName,
				Type:   console.StackTypeTerraform,
				Status: console.StackStatusPending,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.2"),
				},
			}, nil)
			fakeConsoleClient.On("UpdateStackRun", mock.Anything, mock.Anything).Return(nil)

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    consoleURL,
				DeployToken:   deployToken,
			}

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: runNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Verify secret was created
			secret := &corev1.Secret{}
			Expect(kClient.Get(ctx, runNamespacedName, secret)).NotTo(HaveOccurred())
			Expect(string(secret.Data[envConsoleURL])).Should(Equal(consoleURL))
			Expect(string(secret.Data[envConsoleToken])).Should(Equal(deployToken))
			Expect(string(secret.Data[envStackRunID])).Should(Equal(runID))

			// Verify job was created
			job := &batchv1.Job{}
			Expect(kClient.Get(ctx, runNamespacedName, job)).NotTo(HaveOccurred())
			Expect(job.Spec.Template.Spec.Containers).Should(HaveLen(1))
			Expect(job.Spec.Template.Spec.Containers[0].Name).Should(Equal(stackRunDefaultJobContainer))

			// Verify StackRunJob status
			stackRunJob := &v1alpha1.StackRunJob{}
			Expect(kClient.Get(ctx, runNamespacedName, stackRunJob)).NotTo(HaveOccurred())
			Expect(stackRunJob.Status.ID).ShouldNot(BeNil())
			Expect(*stackRunJob.Status.ID).Should(Equal(stackRunName))
			Expect(stackRunJob.Status.JobRef).ShouldNot(BeNil())
			Expect(stackRunJob.Status.JobRef.Name).Should(Equal(runName))
		})

		It("should update status to successful when job completes", func() {
			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStackRun", runID).Return(&console.StackRunMinimalFragment{
				ID:     stackRunName,
				Type:   console.StackTypeTerraform,
				Status: console.StackStatusRunning,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.2"),
				},
			}, nil)
			fakeConsoleClient.On("UpdateStackRun", stackRunName, console.StackRunAttributes{
				Status: console.StackStatusSuccessful,
				JobRef: &console.NamespacedName{
					Name:      runName,
					Namespace: namespace,
				},
			}).Return(nil)

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    consoleURL,
				DeployToken:   deployToken,
			}

			// Update job to completed state
			job := &batchv1.Job{}
			Expect(kClient.Get(ctx, runNamespacedName, job)).NotTo(HaveOccurred())
			Expect(common.MaybePatch(kClient, job,
				func(p *batchv1.Job) {
					now := metav1.Now()
					p.Status.CompletionTime = &now
					p.Status.Conditions = []batchv1.JobCondition{
						{
							Type:   batchv1.JobComplete,
							Status: corev1.ConditionTrue,
						},
					}
				})).To(Succeed())

			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: runNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Verify StackRunJob status
			stackRunJob := &v1alpha1.StackRunJob{}
			Expect(kClient.Get(ctx, runNamespacedName, stackRunJob)).NotTo(HaveOccurred())
			Expect(stackRunJob.Status.JobStatus).Should(Equal(string(console.StackStatusSuccessful)))
		})

		It("should update status to failed when job fails", func() {
			By("Creating a new StackRunJob for failure test")
			failedRunName := "stack-test-run-failed"
			failedRunID := "test-run-failed-456"
			failedNamespacedName := types.NamespacedName{Name: failedRunName, Namespace: namespace}

			resource := &v1alpha1.StackRunJob{
				ObjectMeta: metav1.ObjectMeta{
					Name:      failedRunName,
					Namespace: namespace,
				},
				Spec: v1alpha1.StackRunJobSpec{
					RunID: failedRunID,
				},
			}
			Expect(kClient.Create(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStackRun", failedRunID).Return(&console.StackRunMinimalFragment{
				ID:     "stack-failed-123",
				Type:   console.StackTypeTerraform,
				Status: console.StackStatusRunning,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.2"),
				},
			}, nil)
			fakeConsoleClient.On("UpdateStackRun", "stack-failed-123", mock.Anything).Return(nil)

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    consoleURL,
				DeployToken:   deployToken,
			}

			// First reconcile to create resources
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: failedNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Create a pod for the job to get status from
			job := &batchv1.Job{}
			Expect(kClient.Get(ctx, failedNamespacedName, job)).NotTo(HaveOccurred())

			pod := &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      failedRunName + "-pod",
					Namespace: namespace,
					Labels:    job.Spec.Selector.MatchLabels,
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  stackRunDefaultJobContainer,
							Image: "test-image",
						},
					},
				},
			}
			Expect(kClient.Create(ctx, pod)).To(Succeed())

			// Update pod to terminated state with failure exit code
			Expect(common.MaybePatch(kClient, pod,
				func(p *corev1.Pod) {
					p.Status.ContainerStatuses = []corev1.ContainerStatus{
						{
							Name: stackRunDefaultJobContainer,
							State: corev1.ContainerState{
								Terminated: &corev1.ContainerStateTerminated{
									ExitCode: 65, // Failure exit code
								},
							},
						},
					}
				})).To(Succeed())

			// Update job to failed state
			Expect(common.MaybePatch(kClient, job,
				func(p *batchv1.Job) {
					now := metav1.Now()
					p.Status.CompletionTime = &now
					p.Status.Conditions = []batchv1.JobCondition{
						{
							Type:   batchv1.JobFailed,
							Status: corev1.ConditionTrue,
						},
					}
				})).To(Succeed())

			_, err = reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: failedNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Verify StackRunJob status
			stackRunJob := &v1alpha1.StackRunJob{}
			Expect(kClient.Get(ctx, failedNamespacedName, stackRunJob)).NotTo(HaveOccurred())
			Expect(stackRunJob.Status.JobStatus).Should(Equal(string(console.StackStatusFailed)))

			// Cleanup
			Expect(kClient.Delete(ctx, pod)).To(Succeed())
			Expect(kClient.Delete(ctx, job)).To(Succeed())
			Expect(kClient.Delete(ctx, stackRunJob)).To(Succeed())
			secret := &corev1.Secret{}
			err = kClient.Get(ctx, failedNamespacedName, secret)
			if err == nil {
				Expect(kClient.Delete(ctx, secret)).To(Succeed())
			}
		})
	})

	Context("Helper functions", func() {
		It("should correctly determine exit code status", func() {
			Expect(getExitCodeStatus(64)).Should(Equal(console.StackStatusCancelled))
			Expect(getExitCodeStatus(66)).Should(Equal(console.StackStatusCancelled))
			Expect(getExitCodeStatus(65)).Should(Equal(console.StackStatusFailed))
			Expect(getExitCodeStatus(0)).Should(Equal(console.StackStatusFailed))
			Expect(getExitCodeStatus(1)).Should(Equal(console.StackStatusFailed))
		})

		It("should correctly identify active job", func() {
			job := &batchv1.Job{
				Status: batchv1.JobStatus{
					StartTime: &metav1.Time{Time: time.Now().Add(-1 * time.Minute)},
				},
			}
			Expect(isActiveJob(console.StackStatusPending, job)).Should(BeTrue())
			Expect(isActiveJob(console.StackStatusRunning, job)).Should(BeFalse())

			jobWithCompletion := &batchv1.Job{
				Status: batchv1.JobStatus{
					StartTime:      &metav1.Time{Time: time.Now().Add(-1 * time.Minute)},
					CompletionTime: &metav1.Time{Time: time.Now()},
				},
			}
			Expect(isActiveJob(console.StackStatusPending, jobWithCompletion)).Should(BeFalse())
		})

		It("should correctly identify job timeout", func() {
			oldJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					StartTime: &metav1.Time{Time: time.Now().Add(-45 * time.Minute)},
				},
			}
			Expect(isActiveJobTimout(console.StackStatusPending, oldJob)).Should(BeTrue())

			recentJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					StartTime: &metav1.Time{Time: time.Now().Add(-1 * time.Minute)},
				},
			}
			Expect(isActiveJobTimout(console.StackStatusPending, recentJob)).Should(BeFalse())
		})

		It("should correctly identify controlled job max lifetime timeout", func() {
			oldJob := &batchv1.Job{
				ObjectMeta: metav1.ObjectMeta{
					CreationTimestamp: metav1.Time{Time: time.Now().Add(-13 * time.Hour)},
				},
				Status: batchv1.JobStatus{
					StartTime: &metav1.Time{Time: time.Now().Add(-13 * time.Hour)},
				},
			}
			Expect(isControlledJobTimedOut(oldJob)).Should(BeTrue())

			recentJob := &batchv1.Job{
				ObjectMeta: metav1.ObjectMeta{
					CreationTimestamp: metav1.Time{Time: time.Now().Add(-1 * time.Hour)},
				},
				Status: batchv1.JobStatus{
					StartTime: &metav1.Time{Time: time.Now().Add(-1 * time.Hour)},
				},
			}
			Expect(isControlledJobTimedOut(recentJob)).Should(BeFalse())
		})

		It("should generate correct resource name", func() {
			reconciler := &StackRunJobReconciler{}
			run := &console.StackRunMinimalFragment{
				ID: "test-123",
			}
			Expect(reconciler.GetRunResourceName(run)).Should(Equal("stack-test-123"))
		})
	})

	Context("Secret reconciliation", func() {
		It("should create secret data correctly", func() {
			reconciler := &StackRunJobReconciler{
				ConsoleURL:  "https://console.test.com",
				DeployToken: "test-token-123",
			}
			runID := "run-456"

			data := reconciler.getRunSecretData(runID)
			Expect(data).Should(HaveLen(3))
			Expect(data[envConsoleURL]).Should(Equal("https://console.test.com"))
			Expect(data[envConsoleToken]).Should(Equal("test-token-123"))
			Expect(data[envStackRunID]).Should(Equal("run-456"))
		})

		It("should verify secret data correctly", func() {
			reconciler := &StackRunJobReconciler{
				ConsoleURL:  "https://console.test.com",
				DeployToken: "test-token-123",
			}
			runID := "run-789"

			secretData := map[string][]byte{
				envConsoleURL:   []byte("https://console.test.com"),
				envConsoleToken: []byte("test-token-123"),
				envStackRunID:   []byte("run-789"),
			}

			Expect(reconciler.hasRunSecretData(secretData, runID)).Should(BeTrue())

			// Wrong URL
			wrongSecretData := map[string][]byte{
				envConsoleURL:   []byte("https://wrong.url.com"),
				envConsoleToken: []byte("test-token-123"),
				envStackRunID:   []byte("run-789"),
			}
			Expect(reconciler.hasRunSecretData(wrongSecretData, runID)).Should(BeFalse())

			// Wrong run ID
			wrongRunIDData := map[string][]byte{
				envConsoleURL:   []byte("https://console.test.com"),
				envConsoleToken: []byte("test-token-123"),
				envStackRunID:   []byte("wrong-run-id"),
			}
			Expect(reconciler.hasRunSecretData(wrongRunIDData, runID)).Should(BeFalse())
		})
	})

	Context("Pod status checks", func() {
		It("should get pod status from exit code", func() {
			reconciler := &StackRunJobReconciler{}

			pod := &corev1.Pod{
				Status: corev1.PodStatus{
					ContainerStatuses: []corev1.ContainerStatus{
						{
							Name: stackRunDefaultJobContainer,
							State: corev1.ContainerState{
								Terminated: &corev1.ContainerStateTerminated{
									ExitCode: 65,
								},
							},
						},
					},
				},
			}

			status, err := reconciler.getPodStatus(pod)
			Expect(err).NotTo(HaveOccurred())
			Expect(status).Should(Equal(console.StackStatusFailed))
		})

		It("should return error when container not found", func() {
			reconciler := &StackRunJobReconciler{}

			pod := &corev1.Pod{
				Status: corev1.PodStatus{
					ContainerStatuses: []corev1.ContainerStatus{
						{
							Name: "wrong-container-name",
							State: corev1.ContainerState{
								Terminated: &corev1.ContainerStateTerminated{
									ExitCode: 0,
								},
							},
						},
					},
				},
			}

			_, err := reconciler.getPodStatus(pod)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).Should(ContainSubstring("no job container"))
		})

		It("should return error when container not terminated", func() {
			reconciler := &StackRunJobReconciler{}

			pod := &corev1.Pod{
				Status: corev1.PodStatus{
					ContainerStatuses: []corev1.ContainerStatus{
						{
							Name: stackRunDefaultJobContainer,
							State: corev1.ContainerState{
								Running: &corev1.ContainerStateRunning{},
							},
						},
					},
				},
			}

			_, err := reconciler.getPodStatus(pod)
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).Should(ContainSubstring("not in terminated state"))
		})
	})

	Context("Job timeout and cancellation", func() {
		const (
			timeoutRunName = "stack-test-timeout"
			timeoutRunID   = "test-timeout-789"
			namespace      = "default"
		)

		ctx := context.Background()
		timeoutNamespacedName := types.NamespacedName{Name: timeoutRunName, Namespace: namespace}

		It("should handle job timeout when pending too long", func() {
			By("Creating StackRunJob for timeout test")
			resource := &v1alpha1.StackRunJob{
				ObjectMeta: metav1.ObjectMeta{
					Name:      timeoutRunName,
					Namespace: namespace,
				},
				Spec: v1alpha1.StackRunJobSpec{
					RunID: timeoutRunID,
				},
			}
			Expect(kClient.Create(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStackRun", timeoutRunID).Return(&console.StackRunMinimalFragment{
				ID:     "stack-timeout-123",
				Type:   console.StackTypeTerraform,
				Status: console.StackStatusPending,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.2"),
				},
			}, nil)
			fakeConsoleClient.On("UpdateStackRun", "stack-timeout-123", console.StackRunAttributes{
				Status: console.StackStatusPending,
				JobRef: &console.NamespacedName{
					Name:      timeoutRunName,
					Namespace: namespace,
				},
			}).Return(nil).Once()
			fakeConsoleClient.On("UpdateStackRun", "stack-timeout-123", console.StackRunAttributes{
				Status: console.StackStatusFailed,
				JobRef: &console.NamespacedName{
					Name:      timeoutRunName,
					Namespace: namespace,
				},
			}).Return(nil).Once()

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    "https://console.test.com",
				DeployToken:   "test-token",
			}

			// First reconcile to create resources
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: timeoutNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Update job to be old (started more than 40 minutes ago)
			job := &batchv1.Job{}
			Expect(kClient.Get(ctx, timeoutNamespacedName, job)).NotTo(HaveOccurred())
			Expect(common.MaybePatch(kClient, job,
				func(p *batchv1.Job) {
					oldTime := metav1.Time{Time: time.Now().Add(-45 * time.Minute)}
					p.Status.StartTime = &oldTime
				})).To(Succeed())

			// Reconcile again to trigger timeout
			_, err = reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: timeoutNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Verify status was updated to failed
			stackRunJob := &v1alpha1.StackRunJob{}
			Expect(kClient.Get(ctx, timeoutNamespacedName, stackRunJob)).NotTo(HaveOccurred())
			Expect(stackRunJob.Status.JobStatus).Should(Equal(string(console.StackStatusFailed)))

			// Cleanup
			Expect(kClient.Delete(ctx, stackRunJob)).To(Succeed())
			secret := &corev1.Secret{}
			err = kClient.Get(ctx, timeoutNamespacedName, secret)
			if err == nil {
				Expect(kClient.Delete(ctx, secret)).To(Succeed())
			}
		})

		It("should cancel and kill controlled job after max lifetime", func() {
			By("Creating StackRunJob for max lifetime timeout test")
			maxLifetimeRunName := "stack-test-max-lifetime"
			maxLifetimeRunID := "test-max-lifetime-321"
			maxLifetimeNamespacedName := types.NamespacedName{Name: maxLifetimeRunName, Namespace: namespace}

			resource := &v1alpha1.StackRunJob{
				ObjectMeta: metav1.ObjectMeta{
					Name:      maxLifetimeRunName,
					Namespace: namespace,
				},
				Spec: v1alpha1.StackRunJobSpec{
					RunID: maxLifetimeRunID,
				},
			}
			Expect(kClient.Create(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStackRun", maxLifetimeRunID).Return(&console.StackRunMinimalFragment{
				ID:     "stack-max-lifetime-123",
				Type:   console.StackTypeTerraform,
				Status: console.StackStatusPending,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.2"),
				},
			}, nil)
			fakeConsoleClient.On("UpdateStackRun", "stack-max-lifetime-123", console.StackRunAttributes{
				Status: console.StackStatusPending,
				JobRef: &console.NamespacedName{
					Name:      maxLifetimeRunName,
					Namespace: namespace,
				},
			}).Return(nil).Once()
			fakeConsoleClient.On("UpdateStackRun", "stack-max-lifetime-123", console.StackRunAttributes{
				Status: console.StackStatusCancelled,
				JobRef: &console.NamespacedName{
					Name:      maxLifetimeRunName,
					Namespace: namespace,
				},
			}).Return(nil).Once()

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    "https://console.test.com",
				DeployToken:   "test-token",
			}

			// First reconcile to create resources
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: maxLifetimeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Update job to be older than 12h based on start time
			job := &batchv1.Job{}
			Expect(kClient.Get(ctx, maxLifetimeNamespacedName, job)).NotTo(HaveOccurred())
			Expect(common.MaybePatch(kClient, job,
				func(p *batchv1.Job) {
					oldTime := metav1.Time{Time: time.Now().Add(-13 * time.Hour)}
					p.Status.StartTime = &oldTime
				})).To(Succeed())

			// Reconcile again to trigger max lifetime cancellation
			_, err = reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: maxLifetimeNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Verify status was updated to cancelled
			stackRunJob := &v1alpha1.StackRunJob{}
			Expect(kClient.Get(ctx, maxLifetimeNamespacedName, stackRunJob)).NotTo(HaveOccurred())
			Expect(stackRunJob.Status.JobStatus).Should(Equal(string(console.StackStatusCancelled)))

			// Verify controlled Job was removed
			err = kClient.Get(ctx, maxLifetimeNamespacedName, &batchv1.Job{})
			Expect(errors.IsNotFound(err)).To(BeTrue())

			// Cleanup
			Expect(kClient.Delete(ctx, stackRunJob)).To(Succeed())
			secret := &corev1.Secret{}
			err = kClient.Get(ctx, maxLifetimeNamespacedName, secret)
			if err == nil {
				Expect(kClient.Delete(ctx, secret)).To(Succeed())
			}
		})
	})

	Context("Reconciliation edge cases", func() {
		const (
			edgeCaseRunName = "stack-edge-case"
			edgeCaseRunID   = "test-edge-999"
			namespace       = "default"
		)

		ctx := context.Background()
		edgeCaseNamespacedName := types.NamespacedName{Name: edgeCaseRunName, Namespace: namespace}

		It("should handle StackRun not found in Console", func() {
			By("Creating StackRunJob")
			resource := &v1alpha1.StackRunJob{
				ObjectMeta: metav1.ObjectMeta{
					Name:      edgeCaseRunName,
					Namespace: namespace,
				},
				Spec: v1alpha1.StackRunJobSpec{
					RunID: edgeCaseRunID,
				},
			}
			Expect(kClient.Create(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			// Return a not found error
			notFoundErr := clientv2.ErrorResponse{
				GqlErrors: &gqlerror.List{
					{
						Message: "could not find resource",
					},
				},
			}
			fakeConsoleClient.On("GetStackRun", edgeCaseRunID).Return(nil, &notFoundErr)

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    "https://console.test.com",
				DeployToken:   "test-token",
			}

			// Reconcile should requeue without error when stack run not found
			result, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: edgeCaseNamespacedName})
			Expect(err).NotTo(HaveOccurred())
			Expect(result.RequeueAfter).Should(BeNumerically(">", 0))

			// Cleanup
			stackRunJob := &v1alpha1.StackRunJob{}
			err = kClient.Get(ctx, edgeCaseNamespacedName, stackRunJob)
			if err == nil {
				Expect(kClient.Delete(ctx, stackRunJob)).To(Succeed())
			}
		})

		It("should update job ref when job is still running", func() {
			By("Creating StackRunJob")
			runningName := "stack-running"
			runningID := "running-123"
			resource := &v1alpha1.StackRunJob{
				ObjectMeta: metav1.ObjectMeta{
					Name:      runningName,
					Namespace: namespace,
				},
				Spec: v1alpha1.StackRunJobSpec{
					RunID: runningID,
				},
			}
			Expect(kClient.Create(ctx, resource)).To(Succeed())

			fakeConsoleClient := mocks.NewClientMock(mocks.TestingT)
			fakeConsoleClient.On("GetStackRun", runningID).Return(&console.StackRunMinimalFragment{
				ID:     "stack-running-456",
				Type:   console.StackTypeTerraform,
				Status: console.StackStatusRunning,
				Configuration: console.StackConfigurationFragment{
					Version: lo.ToPtr("1.8.2"),
				},
			}, nil)
			fakeConsoleClient.On("UpdateStackRun", "stack-running-456", console.StackRunAttributes{
				Status: console.StackStatusRunning,
				JobRef: &console.NamespacedName{
					Name:      runningName,
					Namespace: namespace,
				},
			}).Return(nil)

			reconciler := &StackRunJobReconciler{
				Client:        kClient,
				ConsoleClient: fakeConsoleClient,
				Scheme:        kClient.Scheme(),
				ConsoleURL:    "https://console.test.com",
				DeployToken:   "test-token",
			}

			runningNamespacedName := types.NamespacedName{Name: runningName, Namespace: namespace}
			_, err := reconciler.Reconcile(ctx, reconcile.Request{NamespacedName: runningNamespacedName})
			Expect(err).NotTo(HaveOccurred())

			// Job should be created but status should not be updated yet
			stackRunJob := &v1alpha1.StackRunJob{}
			Expect(kClient.Get(ctx, runningNamespacedName, stackRunJob)).NotTo(HaveOccurred())
			Expect(stackRunJob.Status.JobRef).ShouldNot(BeNil())
			Expect(stackRunJob.Status.JobStatus).Should(Equal("Progressing"))

			// Cleanup
			job := &batchv1.Job{}
			err = kClient.Get(ctx, runningNamespacedName, job)
			if err == nil {
				Expect(kClient.Delete(ctx, job)).To(Succeed())
			}
			Expect(kClient.Delete(ctx, stackRunJob)).To(Succeed())
			secret := &corev1.Secret{}
			err = kClient.Get(ctx, runningNamespacedName, secret)
			if err == nil {
				Expect(kClient.Delete(ctx, secret)).To(Succeed())
			}
		})
	})

	Context("Job status helper functions", func() {
		It("should correctly identify succeeded jobs", func() {
			succeededJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					Conditions: []batchv1.JobCondition{
						{
							Type:   batchv1.JobComplete,
							Status: corev1.ConditionTrue,
						},
					},
				},
			}
			Expect(hasSucceeded(succeededJob)).Should(BeTrue())

			failedJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					Conditions: []batchv1.JobCondition{
						{
							Type:   batchv1.JobFailed,
							Status: corev1.ConditionTrue,
						},
					},
				},
			}
			Expect(hasSucceeded(failedJob)).Should(BeFalse())
		})

		It("should correctly identify failed jobs", func() {
			failedJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					Conditions: []batchv1.JobCondition{
						{
							Type:   batchv1.JobFailed,
							Status: corev1.ConditionTrue,
						},
					},
				},
			}
			Expect(hasFailed(failedJob)).Should(BeTrue())

			succeededJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					Conditions: []batchv1.JobCondition{
						{
							Type:   batchv1.JobComplete,
							Status: corev1.ConditionTrue,
						},
					},
				},
			}
			Expect(hasFailed(succeededJob)).Should(BeFalse())

			runningJob := &batchv1.Job{
				Status: batchv1.JobStatus{
					Conditions: []batchv1.JobCondition{},
				},
			}
			Expect(hasFailed(runningJob)).Should(BeFalse())
		})
	})
})
