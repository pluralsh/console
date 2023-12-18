package controllers_test

import (
	"context"
	"encoding/json"
	"testing"

	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/controllers"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/client-go/kubernetes/scheme"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/test/mocks"
)

func init() {
	utilruntime.Must(v1alpha1.AddToScheme(scheme.Scheme))
}

func sanitizeConditions(status v1alpha1.ProviderStatus) v1alpha1.ProviderStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	return status
}

func TestCreateNewProvider(t *testing.T) {
	test := struct {
		name                          string
		providerName                  string
		returnCreateProvider          *gqlclient.ClusterProviderFragment
		returnGetProviderByCloudError error
		existingObjects               []ctrlruntimeclient.Object
		expectedStatus                v1alpha1.ProviderStatus
	}{

		name:         "create a new provider",
		providerName: "gcp-provider",
		returnCreateProvider: &gqlclient.ClusterProviderFragment{
			ID:        "1234",
			Name:      "gcp-provider",
			Namespace: "gcp",
			Cloud:     "gcp",
		},
		returnGetProviderByCloudError: errors.NewNotFound(schema.GroupResource{}, "gcp-provider"),
		existingObjects: []ctrlruntimeclient.Object{
			&v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{
					Name: "gcp-provider",
				},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "gcp",
					CloudSettings: &v1alpha1.CloudProviderSettings{
						GCP: &corev1.SecretReference{
							Name: "credentials",
						},
					},
					Name:      "gcp-provider",
					Namespace: "gcp",
				},
			},
			&corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name: "credentials",
				},
				Data: map[string][]byte{
					"applicationCredentials": []byte("mock"),
				},
			},
		},
		expectedStatus: v1alpha1.ProviderStatus{
			ID:  lo.ToPtr("1234"),
			SHA: lo.ToPtr("QL7PGU67IFKWWO4A7AU33D2HCTSGG4GGXR32DZXNPE6GDBHLXUSQ===="),
			Conditions: []metav1.Condition{
				{
					Type:   v1alpha1.ReadonlyConditionType.String(),
					Status: metav1.ConditionFalse,
					Reason: v1alpha1.ReadonlyConditionReason.String(),
				},
				{
					Type:   v1alpha1.ReadyConditionType.String(),
					Status: metav1.ConditionTrue,
					Reason: v1alpha1.ReadyConditionReason.String(),
				},
			},
		},
	}

	t.Run(test.name, func(t *testing.T) {
		// set up the test scenario
		fakeClient := fake.
			NewClientBuilder().
			WithScheme(scheme.Scheme).
			WithObjects(test.existingObjects...).
			Build()

		fakeConsoleClient := mocks.NewConsoleClient(t)

		// act
		ctx := context.Background()
		providerReconciler := &controllers.ProviderReconciler{
			Client:        fakeClient,
			Scheme:        scheme.Scheme,
			ConsoleClient: fakeConsoleClient,
		}

		fakeConsoleClient.On("GetProviderByCloud", mock.Anything, v1alpha1.GCP).Return(nil, test.returnGetProviderByCloudError)
		fakeConsoleClient.On("IsProviderExists", mock.Anything, mock.Anything).Return(false)
		fakeConsoleClient.On("CreateProvider", mock.Anything, mock.Anything).Return(test.returnCreateProvider, nil)

		_, err := providerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.providerName}})
		assert.NoError(t, err)

		existingProvider := &v1alpha1.Provider{}
		err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.providerName}, existingProvider)

		existingProviderStatusJson, err := json.Marshal(sanitizeConditions(existingProvider.Status))
		expectedStatusJson, err := json.Marshal(sanitizeConditions(test.expectedStatus))

		assert.NoError(t, err)
		assert.EqualValues(t, string(expectedStatusJson), string(existingProviderStatusJson))
	})
}

func TestAdoptProvider(t *testing.T) {
	test := struct {
		name                     string
		providerName             string
		returnGetProviderByCloud *gqlclient.ClusterProviderFragment
		existingObjects          []ctrlruntimeclient.Object
		expectedStatus           v1alpha1.ProviderStatus
	}{
		name:         "adopt existing provider",
		providerName: "gcp-provider",
		returnGetProviderByCloud: &gqlclient.ClusterProviderFragment{
			ID:        "1234",
			Name:      "gcp-provider",
			Namespace: "gcp",
			Cloud:     "gcp",
		},
		existingObjects: []ctrlruntimeclient.Object{
			&v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{
					Name: "gcp-provider",
				},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "gcp",
					CloudSettings: &v1alpha1.CloudProviderSettings{
						GCP: &corev1.SecretReference{
							Name: "credentials",
						},
					},
					Name:      "gcp-provider",
					Namespace: "gcp",
				},
			},
			&corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name: "credentials",
				},
				Data: map[string][]byte{
					"applicationCredentials": []byte("mock"),
				},
			},
		},
		expectedStatus: v1alpha1.ProviderStatus{
			ID: lo.ToPtr("1234"),
			Conditions: []metav1.Condition{
				{
					Type:    v1alpha1.ReadonlyConditionType.String(),
					Status:  metav1.ConditionTrue,
					Reason:  v1alpha1.ReadonlyConditionReason.String(),
					Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
				},
				{
					Type:   v1alpha1.ReadyConditionType.String(),
					Status: metav1.ConditionTrue,
					Reason: v1alpha1.ReadyConditionReason.String(),
				},
			},
		},
	}

	t.Run(test.name, func(t *testing.T) {
		// set up the test scenario
		fakeClient := fake.
			NewClientBuilder().
			WithScheme(scheme.Scheme).
			WithObjects(test.existingObjects...).
			Build()

		fakeConsoleClient := mocks.NewConsoleClient(t)

		// act
		ctx := context.Background()
		providerReconciler := &controllers.ProviderReconciler{
			Client:        fakeClient,
			Scheme:        scheme.Scheme,
			ConsoleClient: fakeConsoleClient,
		}

		fakeConsoleClient.On("GetProviderByCloud", mock.Anything, v1alpha1.GCP).Return(test.returnGetProviderByCloud, nil)

		_, err := providerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.providerName}})
		assert.NoError(t, err)

		existingProvider := &v1alpha1.Provider{}
		err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.providerName}, existingProvider)

		existingProviderStatusJson, err := json.Marshal(sanitizeConditions(existingProvider.Status))
		expectedStatusJson, err := json.Marshal(sanitizeConditions(test.expectedStatus))

		assert.NoError(t, err)
		assert.EqualValues(t, string(expectedStatusJson), string(existingProviderStatusJson))
	})
}

func TestUpdateProvider(t *testing.T) {
	test := struct {
		name                 string
		providerName         string
		returnUpdateProvider *gqlclient.ClusterProviderFragment
		existingObjects      []ctrlruntimeclient.Object
		expectedStatus       v1alpha1.ProviderStatus
	}{
		name:         "update existing provider",
		providerName: "gcp-provider",
		returnUpdateProvider: &gqlclient.ClusterProviderFragment{
			ID:        "1234",
			Name:      "gcp-provider",
			Namespace: "gcp",
			Cloud:     "gcp",
		},
		existingObjects: []ctrlruntimeclient.Object{
			&v1alpha1.Provider{
				ObjectMeta: metav1.ObjectMeta{
					Name: "gcp-provider",
				},
				Spec: v1alpha1.ProviderSpec{
					Cloud: "gcp",
					CloudSettings: &v1alpha1.CloudProviderSettings{
						GCP: &corev1.SecretReference{
							Name: "credentials",
						},
					},
					Name:      "gcp-provider",
					Namespace: "gcp",
				},
				Status: v1alpha1.ProviderStatus{
					ID:  lo.ToPtr("1234"),
					SHA: lo.ToPtr(""),
					Conditions: []metav1.Condition{
						{
							Type:   v1alpha1.ReadonlyConditionType.String(),
							Status: metav1.ConditionFalse,
							Reason: v1alpha1.ReadonlyConditionReason.String(),
						},
					},
				},
			},
			&corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name: "credentials",
				},
				Data: map[string][]byte{
					"applicationCredentials": []byte("mock"),
				},
			},
		},
		expectedStatus: v1alpha1.ProviderStatus{
			ID:  lo.ToPtr("1234"),
			SHA: lo.ToPtr("QL7PGU67IFKWWO4A7AU33D2HCTSGG4GGXR32DZXNPE6GDBHLXUSQ===="),
			Conditions: []metav1.Condition{
				{
					Type:   v1alpha1.ReadonlyConditionType.String(),
					Status: metav1.ConditionFalse,
					Reason: v1alpha1.ReadonlyConditionReason.String(),
				},
				{
					Type:   v1alpha1.ReadyConditionType.String(),
					Status: metav1.ConditionTrue,
					Reason: v1alpha1.ReadyConditionReason.String(),
				},
			},
		},
	}

	t.Run(test.name, func(t *testing.T) {
		// set up the test scenario
		fakeClient := fake.
			NewClientBuilder().
			WithScheme(scheme.Scheme).
			WithObjects(test.existingObjects...).
			Build()

		fakeConsoleClient := mocks.NewConsoleClient(t)

		// act
		ctx := context.Background()
		providerReconciler := &controllers.ProviderReconciler{
			Client:        fakeClient,
			Scheme:        scheme.Scheme,
			ConsoleClient: fakeConsoleClient,
		}

		fakeConsoleClient.On("IsProviderExists", mock.Anything, mock.Anything).Return(true, nil)
		fakeConsoleClient.On("UpdateProvider", mock.Anything, mock.Anything, mock.Anything).Return(test.returnUpdateProvider, nil)

		_, err := providerReconciler.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.providerName}})
		assert.NoError(t, err)

		existingProvider := &v1alpha1.Provider{}
		err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.providerName}, existingProvider)

		existingProviderStatusJson, err := json.Marshal(sanitizeConditions(existingProvider.Status))
		expectedStatusJson, err := json.Marshal(sanitizeConditions(test.expectedStatus))

		assert.NoError(t, err)
		assert.EqualValues(t, string(expectedStatusJson), string(existingProviderStatusJson))
	})
}
