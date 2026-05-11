package controller

import (
	"fmt"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSentinelGenerateRunJob(t *testing.T) {
	namespace := defaultName
	runID := "1"
	secretName := fmt.Sprintf("sentinel-%s", runID)
	reconciler := SentinelRunJobReconciler{}
	cases := []struct {
		name     string
		run      *console.SentinelRunJobFragment
		wantSpec batchv1.JobSpec
		validate func(*testing.T, *batchv1.Job)
	}{
		{
			name: "use_empty_job_spec",
			run: &console.SentinelRunJobFragment{
				ID: runID,
			},
			wantSpec: func() batchv1.JobSpec {
				js := genDefaultSentinelJobSpec(namespace, "use_empty_job_spec", runID)
				js.Template.Labels = nil
				return js
			}(),
		},
		{
			name: "use_defaults",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
				},
			},
			wantSpec: genDefaultSentinelJobSpec(namespace, "use_defaults", runID),
		},
		{
			name: "add_labels",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Labels: map[string]interface{}{
						"test": "test",
					},
				},
			},
			wantSpec: func() batchv1.JobSpec {
				js := genDefaultSentinelJobSpec(namespace, "add_labels", runID)
				js.Template.Labels = map[string]string{
					"test": "test",
				}
				return js
			}(),
		},
		{
			name: "node_selector",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					NodeSelector: map[string]any{
						"kubernetes.io/os": "linux",
					},
				},
			},
			wantSpec: func() batchv1.JobSpec {
				js := genDefaultSentinelJobSpec(namespace, "node_selector", runID)
				js.Template.Spec.NodeSelector = map[string]string{
					"kubernetes.io/os": "linux",
				}
				return js
			}(),
		},
		{
			name: "tolerations",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Tolerations: []*console.JobSpecFragment_Tolerations{
						{
							Key:      lo.ToPtr("dedicated"),
							Operator: lo.ToPtr("Equal"),
							Value:    lo.ToPtr("sentinel"),
							Effect:   lo.ToPtr("NoSchedule"),
						},
					},
				},
			},
			wantSpec: func() batchv1.JobSpec {
				js := genDefaultSentinelJobSpec(namespace, "tolerations", runID)
				js.Template.Spec.Tolerations = []corev1.Toleration{
					{
						Key:      "dedicated",
						Operator: corev1.TolerationOpEqual,
						Value:    "sentinel",
						Effect:   corev1.TaintEffectNoSchedule,
					},
				}
				return js
			}(),
		},
		{
			name: "add_resources",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Requests: &console.ContainerResourcesFragment{
						Requests: &console.ResourceRequestFragment{
							CPU: lo.ToPtr("2Mi"),
						},
						Limits: &console.ResourceRequestFragment{
							Memory: lo.ToPtr("2M"),
						},
					},
				},
			},
			wantSpec: func() batchv1.JobSpec {
				js := genDefaultSentinelJobSpec(namespace, "add_resources", runID)
				js.Template.Spec.Containers[0].Resources = corev1.ResourceRequirements{
					Requests: corev1.ResourceList{
						corev1.ResourceCPU: resource.MustParse("2Mi"),
					},
					Limits: corev1.ResourceList{
						corev1.ResourceMemory: resource.MustParse("2M"),
					},
				}
				return js
			}(),
		},
		{
			name: "sidecar_container_appends_default",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Containers: []*console.ContainerSpecFragment{
						{Image: "my.registry/sentinel-harness:v1"},
					},
				},
			},
			validate: func(t *testing.T, job *batchv1.Job) {
				cs := job.Spec.Template.Spec.Containers
				require.Len(t, cs, 2)
				assert.Equal(t, "sidecar_container_appends_default-0", cs[0].Name)
				assert.Equal(t, "my.registry/sentinel-harness:v1", cs[0].Image)
				assert.Nil(t, cs[0].SecurityContext)
				assert.Equal(t, defaultName, cs[1].Name)
				assert.Equal(t, "ghcr.io/pluralsh/sentinel-harness:latest", cs[1].Image)
				assert.NotNil(t, cs[1].SecurityContext)
				assertEnvFromContainsSecret(t, cs[0].EnvFrom, secretName)
				assertEnvFromContainsSecret(t, cs[1].EnvFrom, secretName)
			},
		},
		{
			name: "default_container_in_spec_empty_image_fills_harness",
			run: &console.SentinelRunJobFragment{
				ID: runID,
				JobSpec: &console.JobSpecFragment{
					Namespace: namespace,
					Containers: []*console.ContainerSpecFragment{
						{Name: lo.ToPtr("default"), Image: ""},
					},
				},
			},
			validate: func(t *testing.T, job *batchv1.Job) {
				cs := job.Spec.Template.Spec.Containers
				require.Len(t, cs, 1)
				assert.Equal(t, defaultName, cs[0].Name)
				assert.Equal(t, "ghcr.io/pluralsh/sentinel-harness:latest", cs[0].Image)
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// Matches reconcileRunJob: GetRunJobSpec(srj.Name, run.JobSpec) — container names use the CR/job name.
			jobSpec := common.GetRunJobSpec(tc.name, tc.run.JobSpec)
			job, err := reconciler.GenerateRunJob(tc.run, jobSpec, tc.name, namespace)
			require.NoError(t, err)
			require.NotNil(t, job)
			if tc.validate != nil {
				tc.validate(t, job)
				return
			}
			assert.Equal(t, tc.wantSpec, job.Spec)
		})
	}
}

// TestGenerateRunJobPreservesExplicitDefaultContainerImage ensures the harness default container keeps
// the image from the run job fragment when JobSpec.Containers names the default container and sets Image.
func TestGenerateRunJobPreservesExplicitDefaultContainerImage(t *testing.T) {
	namespace := defaultName
	runID := "preserve-img-run"
	secretName := fmt.Sprintf("sentinel-%s", runID)
	explicitImage := "registry.example.com/sentinel-harness:production"
	reconciler := SentinelRunJobReconciler{}
	run := &console.SentinelRunJobFragment{
		ID: runID,
		JobSpec: &console.JobSpecFragment{
			Namespace: namespace,
			Containers: []*console.ContainerSpecFragment{
				{Name: lo.ToPtr("default"), Image: explicitImage},
			},
		},
	}
	jobName := "preserve-explicit-default-image"
	jobSpec := common.GetRunJobSpec(jobName, run.JobSpec)
	job, err := reconciler.GenerateRunJob(run, jobSpec, jobName, namespace)
	require.NoError(t, err)
	require.NotNil(t, job)

	cs := job.Spec.Template.Spec.Containers
	require.Len(t, cs, 1)
	assert.Equal(t, defaultName, cs[0].Name)
	assert.Equal(t, explicitImage, cs[0].Image, "fragment image for default container must not be replaced by the harness default image")
	assertEnvFromContainsSecret(t, cs[0].EnvFrom, secretName)
}

func assertEnvFromContainsSecret(t *testing.T, envFrom []corev1.EnvFromSource, secretName string) {
	t.Helper()
	for _, e := range envFrom {
		if e.SecretRef != nil && e.SecretRef.Name == secretName {
			return
		}
	}
	t.Fatalf("expected EnvFrom to reference secret %q", secretName)
}

func genDefaultSentinelJobSpec(namespace, name, runID string) batchv1.JobSpec {
	r := SentinelRunJobReconciler{}
	return batchv1.JobSpec{
		Template: corev1.PodTemplateSpec{
			ObjectMeta: metav1.ObjectMeta{
				Name:        name,
				Namespace:   namespace,
				Labels:      map[string]string{},
				Annotations: map[string]string{podDefaultContainerAnnotation: "default"},
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Name:       defaultName,
						Image:      "ghcr.io/pluralsh/sentinel-harness:latest",
						WorkingDir: "",
						EnvFrom: []corev1.EnvFromSource{
							{
								SecretRef: &corev1.SecretEnvSource{
									LocalObjectReference: corev1.LocalObjectReference{
										Name: fmt.Sprintf("sentinel-%s", runID),
									},
								},
							},
						},
						Env:                      make([]corev1.EnvVar, 0),
						Resources:                corev1.ResourceRequirements{},
						VolumeMounts:             r.ensureDefaultVolumeMounts(nil),
						TerminationMessagePath:   "",
						TerminationMessagePolicy: "",
						ImagePullPolicy:          "",
						SecurityContext:          r.ensureDefaultContainerSecurityContext(nil),
						Stdin:                    false,
						StdinOnce:                false,
						TTY:                      false,
					},
				},
				RestartPolicy:   corev1.RestartPolicyNever,
				Volumes:         r.ensureDefaultVolumes(nil),
				SecurityContext: r.ensureDefaultPodSecurityContext(nil),
			},
		},
		TTLSecondsAfterFinished: lo.ToPtr(int32(5 * 60)),
		BackoffLimit:            lo.ToPtr(int32(0)),
	}
}

func TestSentinelControlledJobTimedOut(t *testing.T) {
	oldJob := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			CreationTimestamp: metav1.Time{Time: time.Now().Add(-13 * time.Hour)},
		},
		Status: batchv1.JobStatus{
			StartTime: &metav1.Time{Time: time.Now().Add(-13 * time.Hour)},
		},
	}
	assert.True(t, isSentinelControlledJobTimedOut(oldJob))

	recentJob := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			CreationTimestamp: metav1.Time{Time: time.Now().Add(-1 * time.Hour)},
		},
		Status: batchv1.JobStatus{
			StartTime: &metav1.Time{Time: time.Now().Add(-1 * time.Hour)},
		},
	}
	assert.False(t, isSentinelControlledJobTimedOut(recentJob))
}
