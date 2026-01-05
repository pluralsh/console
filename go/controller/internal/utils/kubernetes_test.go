package utils_test

import (
	"context"
	"testing"

	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestAddOwnerRefAnnotation(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	owner := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owner-pod",
			Namespace: "default",
		},
	}

	object := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owned-cm",
			Namespace: "default",
		},
	}

	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(object).Build()

	err := utils.AddOwnerRefAnnotation(context.Background(), client, owner, object)
	assert.NoError(t, err)

	// Fetch updated object
	err = client.Get(context.Background(), types.NamespacedName{Name: object.Name, Namespace: object.Namespace}, object)
	assert.NoError(t, err)

	// Verify annotation
	assert.Equal(t, "default/owner-pod", object.Annotations[utils.OwnerRefAnnotation])

	// Add another owner
	owner2 := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owner-pod-2",
			Namespace: "default",
		},
	}

	err = utils.AddOwnerRefAnnotation(context.Background(), client, owner2, object)
	assert.NoError(t, err)

	// Fetch updated object
	err = client.Get(context.Background(), types.NamespacedName{Name: object.Name, Namespace: object.Namespace}, object)
	assert.NoError(t, err)

	// Verify annotation contains both
	assert.Contains(t, object.Annotations[utils.OwnerRefAnnotation], "default/owner-pod")
	assert.Contains(t, object.Annotations[utils.OwnerRefAnnotation], "default/owner-pod-2")
}

func TestGetOwnerRefsAnnotationRequests(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	owner := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owner-pod",
			Namespace: "default",
		},
	}

	object := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owned-cm",
			Namespace: "default",
			Annotations: map[string]string{
				utils.OwnerRefAnnotation: "default/owner-pod",
			},
		},
	}

	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(owner, object).Build()

	requests := utils.GetOwnerRefsAnnotationRequests(context.Background(), client, object, &corev1.Pod{})

	assert.Len(t, requests, 1)
	assert.Equal(t, "owner-pod", requests[0].Name)
	assert.Equal(t, "default", requests[0].Namespace)
}

func TestGetOwnerRefsAnnotationRequests_MissingOwner(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	object := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "owned-cm",
			Namespace: "default",
			Annotations: map[string]string{
				utils.OwnerRefAnnotation: "default/missing-pod",
			},
		},
	}

	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(object).Build()

	requests := utils.GetOwnerRefsAnnotationRequests(context.Background(), client, object, &corev1.Pod{})

	assert.Len(t, requests, 0)
}
