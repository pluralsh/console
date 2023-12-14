package reconciler_test

import (
	"context"
	"testing"

	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/reconciler"
	"github.com/pluralsh/console/controller/pkg/test/mocks"
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
	ctrl "sigs.k8s.io/controller-runtime"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func init() {
	utilruntime.Must(v1alpha1.AddToScheme(scheme.Scheme))
}

func TestCreateNewCluster(t *testing.T) {
	const (
		clusterName       = "test-cluster"
		clusterConsoleID  = "12345-67890"
		providerName      = "test-provider"
		providerNamespace = "test-provider"
		providerConsoleID = "12345-67890"
	)

	tests := []struct {
		name                          string
		cluster                       string
		returnGetClusterByHandle      *gqlclient.ClusterFragment
		returnErrorGetClusterByHandle error
		returnIsClusterExisting       bool
		returnCreateCluster           *gqlclient.ClusterFragment
		returnErrorCreateCluster      error
		existingObjects               []ctrlruntimeclient.Object
		expectedStatus                v1alpha1.ClusterStatus
	}{
		{
			name:    "scenario 1: create a new AWS cluster",
			cluster: clusterName,
			expectedStatus: v1alpha1.ClusterStatus{
				ID:       lo.ToPtr(clusterConsoleID),
				SHA:      lo.ToPtr("DU5PTA62PGOS35CPPCNSRG6PGXUUIWTXVBK5BFXCCGCAAM2K6HYA===="),
				Existing: lo.ToPtr(false),
			},
			returnGetClusterByHandle:      nil,
			returnErrorGetClusterByHandle: errors.NewNotFound(schema.GroupResource{}, clusterName),
			returnIsClusterExisting:       false,
			returnCreateCluster:           &gqlclient.ClusterFragment{ID: clusterConsoleID},
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						Name: clusterName,
					},
					Spec: v1alpha1.ClusterSpec{
						Handle:  lo.ToPtr(clusterName),
						Version: lo.ToPtr("1.24"),
						Cloud:   "aws",
						ProviderRef: &corev1.ObjectReference{
							Name: providerName,
						},
					},
				},
				&v1alpha1.Provider{
					ObjectMeta: metav1.ObjectMeta{
						Name: providerName,
					},
					Spec: v1alpha1.ProviderSpec{
						Cloud:     "aws",
						Name:      providerName,
						Namespace: providerNamespace,
					},
					Status: v1alpha1.ProviderStatus{
						ID: lo.ToPtr(providerConsoleID),
					},
				},
			},
		},
		{
			name:    "scenario 2: create a new BYOK cluster",
			cluster: clusterName,
			expectedStatus: v1alpha1.ClusterStatus{
				ID:       lo.ToPtr(clusterConsoleID),
				SHA:      lo.ToPtr("XGLLQCLXY5LEQV2UAQDUSOZ2MN24L67HDIGWRK2MA5STBBRNMVDA===="),
				Existing: lo.ToPtr(false),
			},
			returnGetClusterByHandle:      nil,
			returnErrorGetClusterByHandle: errors.NewNotFound(schema.GroupResource{}, clusterName),
			returnIsClusterExisting:       false,
			returnCreateCluster:           &gqlclient.ClusterFragment{ID: clusterConsoleID},
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						Name: clusterName,
					},
					Spec: v1alpha1.ClusterSpec{
						Handle: lo.ToPtr(clusterName),
						Cloud:  "byok",
					},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(test.returnGetClusterByHandle, test.returnErrorGetClusterByHandle)
			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(test.returnIsClusterExisting)
			fakeConsoleClient.On("CreateCluster", mock.Anything).Return(test.returnCreateCluster, test.returnErrorCreateCluster)

			ctx := context.Background()

			target := &reconciler.ClusterReconciler{
				Client:        fakeClient,
				Log:           ctrl.Log.WithName("reconcilers").WithName("ClusterReconciler"),
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.cluster}})
			assert.NoError(t, err)

			existingCluster := &v1alpha1.Cluster{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.cluster}, existingCluster)
			assert.NoError(t, err)
			assert.EqualValues(t, test.expectedStatus, existingCluster.Status)
		})
	}
}

func TestAdoptExistingCluster(t *testing.T) {
	const (
		clusterName      = "test-cluster"
		clusterConsoleID = "12345-67890"
	)

	tests := []struct {
		name                          string
		cluster                       string
		returnGetClusterByHandle      *gqlclient.ClusterFragment
		returnErrorGetClusterByHandle error
		existingObjects               []ctrlruntimeclient.Object
		expectedStatus                v1alpha1.ClusterStatus
	}{
		{
			name:    "scenario 1: adopt existing AWS cluster",
			cluster: clusterName,
			expectedStatus: v1alpha1.ClusterStatus{
				ID:       lo.ToPtr(clusterConsoleID),
				Existing: lo.ToPtr(true),
			},
			returnGetClusterByHandle:      &gqlclient.ClusterFragment{ID: clusterConsoleID},
			returnErrorGetClusterByHandle: nil,
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{Name: clusterName},
					Spec:       v1alpha1.ClusterSpec{Handle: lo.ToPtr(clusterName)},
				},
			},
		},
		{
			name:    "scenario 2: adopt existing BYOK cluster",
			cluster: clusterName,
			expectedStatus: v1alpha1.ClusterStatus{
				ID:             lo.ToPtr(clusterConsoleID),
				Existing:       lo.ToPtr(true),
				CurrentVersion: lo.ToPtr("1.24.11"),
			},
			returnGetClusterByHandle: &gqlclient.ClusterFragment{
				ID:             clusterConsoleID,
				CurrentVersion: lo.ToPtr("1.24.11"),
			},
			returnErrorGetClusterByHandle: nil,
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{Name: clusterName},
					Spec: v1alpha1.ClusterSpec{
						Handle: lo.ToPtr(clusterName),
						Cloud:  "byok",
					},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)
			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(test.returnGetClusterByHandle, test.returnErrorGetClusterByHandle)

			ctx := context.Background()

			target := &reconciler.ClusterReconciler{
				Client:        fakeClient,
				Log:           ctrl.Log.WithName("reconcilers").WithName("ClusterReconciler"),
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.cluster}})
			assert.NoError(t, err)

			existingCluster := &v1alpha1.Cluster{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.cluster}, existingCluster)
			assert.NoError(t, err)
			assert.EqualValues(t, test.expectedStatus, existingCluster.Status)
		})
	}
}
