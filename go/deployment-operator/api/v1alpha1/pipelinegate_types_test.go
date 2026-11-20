package v1alpha1

import (
	"testing"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestPipelineGate_CreateNewJobRefKeepsGateNamespace(t *testing.T) {
	gate := &PipelineGate{
		ObjectMeta: metav1.ObjectMeta{Name: "gate", Namespace: "plrl-deploy-operator"},
		Spec: PipelineGateSpec{
			GateSpec: &GateSpec{
				JobSpec: &batchv1.JobSpec{
					Template: corev1.PodTemplateSpec{
						ObjectMeta: metav1.ObjectMeta{Namespace: "jobs"},
					},
				},
			},
		},
	}

	jobRef := gate.CreateNewJobRef()

	if jobRef.Name != "gate" || jobRef.Namespace != "plrl-deploy-operator" {
		t.Fatalf("unexpected job ref %+v", jobRef)
	}
	if gate.Namespace != "plrl-deploy-operator" {
		t.Fatalf("gate namespace changed to %q", gate.Namespace)
	}
}
