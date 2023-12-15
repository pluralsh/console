package reconciler_test

import (
	"context"
	"testing"
	"time"

	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/reconciler"
	"github.com/pluralsh/console/controller/pkg/test/mocks"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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

func TestCreateNewService(t *testing.T) {
	const (
		serviceName = "test"
		clusterName = "testCluster"
		repoName    = "testRepo"
	)
	tests := []struct {
		name                     string
		service                  string
		returnGetService         *gqlclient.ServiceDeploymentExtended
		returnIsClusterExisting  bool
		returnCreateCluster      *gqlclient.CreateServiceDeployment
		returnErrorCreateCluster error
		existingObjects          []ctrlruntimeclient.Object
		expectedStatus           v1alpha1.ServiceStatus
	}{
		{
			name:    "scenario 1: create a new service",
			service: "test",
			expectedStatus: v1alpha1.ServiceStatus{
				Id:  lo.ToPtr("123"),
				Sha: "E2KK4GJDZD4C62CW2OXWRDOWPOQ6XQJ4XHGZYFTANUMGIN7SGTPQ====",
			},
			returnGetService: &gqlclient.ServiceDeploymentExtended{
				ID: "123",
			},
			returnIsClusterExisting: false,
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.ServiceDeployment{
					ObjectMeta: metav1.ObjectMeta{Name: serviceName},
					Spec: v1alpha1.ServiceSpec{
						Version:       "1.24",
						ClusterRef:    corev1.ObjectReference{Name: clusterName},
						RepositoryRef: corev1.ObjectReference{Name: repoName},
					},
				},
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						Name: clusterName,
					},
					Status: v1alpha1.ClusterStatus{
						ID: lo.ToPtr("123"),
					},
				},
				&v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name: repoName,
					},
					Status: v1alpha1.GitRepositoryStatus{
						Id:     lo.ToPtr("123"),
						Health: v1alpha1.GitHealthPullable,
					},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(nil, nil).Once()
			fakeConsoleClient.On("CreateService", mock.Anything, mock.Anything).Return(nil, nil)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)

			ctx := context.Background()

			target := &reconciler.ServiceReconciler{
				Client:        fakeClient,
				Log:           ctrl.Log.WithName("reconcilers").WithName("ServiceReconciler"),
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.service}})
			assert.NoError(t, err)

			existingService := &v1alpha1.ServiceDeployment{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.service}, existingService)
			assert.NoError(t, err)
			assert.EqualValues(t, test.expectedStatus, existingService.Status)
		})
	}
}

func TestDeleteService(t *testing.T) {
	const (
		serviceName = "test"
		clusterName = "testCluster"
		repoName    = "testRepo"
	)
	tests := []struct {
		name                     string
		service                  string
		returnGetService         *gqlclient.ServiceDeploymentExtended
		returnIsClusterExisting  bool
		returnCreateCluster      *gqlclient.CreateServiceDeployment
		returnErrorCreateCluster error
		existingObjects          []ctrlruntimeclient.Object
		expectedStatus           v1alpha1.ServiceStatus
	}{
		{
			name:    "scenario 1: delete service",
			service: "test",
			expectedStatus: v1alpha1.ServiceStatus{
				Id:  lo.ToPtr("123"),
				Sha: "E2KK4GJDZD4C62CW2OXWRDOWPOQ6XQJ4XHGZYFTANUMGIN7SGTPQ====",
			},
			returnGetService: &gqlclient.ServiceDeploymentExtended{
				ID: "123",
			},
			returnIsClusterExisting: false,
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.ServiceDeployment{
					ObjectMeta: metav1.ObjectMeta{
						Name:              serviceName,
						DeletionTimestamp: &metav1.Time{Time: time.Date(1998, time.May, 5, 5, 5, 5, 0, time.UTC)},
						Finalizers:        []string{reconciler.ServiceFinalizer},
					},
					Spec: v1alpha1.ServiceSpec{
						Version:       "1.24",
						ClusterRef:    corev1.ObjectReference{Name: clusterName},
						RepositoryRef: corev1.ObjectReference{Name: repoName},
					},
					Status: v1alpha1.ServiceStatus{
						Id: lo.ToPtr("123"),
					},
				},
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						Name: clusterName,
					},
					Status: v1alpha1.ClusterStatus{
						ID: lo.ToPtr("123"),
					},
				},
				&v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name: repoName,
					},
					Status: v1alpha1.GitRepositoryStatus{
						Id:     lo.ToPtr("123"),
						Health: v1alpha1.GitHealthPullable,
					},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(nil, nil).Once()
			ctx := context.Background()

			target := &reconciler.ServiceReconciler{
				Client:        fakeClient,
				Log:           ctrl.Log.WithName("reconcilers").WithName("ServiceReconciler"),
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.service}})
			assert.NoError(t, err)

			existingService := &v1alpha1.ServiceDeployment{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.service}, existingService)
			assert.True(t, apierrors.IsNotFound(err))
		})
	}
}

func TestUpdateService(t *testing.T) {
	const (
		serviceName = "test"
		clusterName = "testCluster"
		repoName    = "testRepo"
	)
	tests := []struct {
		name                     string
		service                  string
		returnGetService         *gqlclient.ServiceDeploymentExtended
		returnIsClusterExisting  bool
		returnCreateCluster      *gqlclient.CreateServiceDeployment
		returnErrorCreateCluster error
		existingObjects          []ctrlruntimeclient.Object
		expectedStatus           v1alpha1.ServiceStatus
	}{
		{
			name:    "scenario 1: create a new service",
			service: "test",
			expectedStatus: v1alpha1.ServiceStatus{
				Id:  lo.ToPtr("123"),
				Sha: "E2KK4GJDZD4C62CW2OXWRDOWPOQ6XQJ4XHGZYFTANUMGIN7SGTPQ====",
			},
			returnGetService: &gqlclient.ServiceDeploymentExtended{
				ID: "123",
			},
			returnIsClusterExisting: false,
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.ServiceDeployment{
					ObjectMeta: metav1.ObjectMeta{Name: serviceName},
					Spec: v1alpha1.ServiceSpec{
						Version:       "1.24",
						ClusterRef:    corev1.ObjectReference{Name: clusterName},
						RepositoryRef: corev1.ObjectReference{Name: repoName},
					},
					Status: v1alpha1.ServiceStatus{
						Id:  lo.ToPtr("123"),
						Sha: "abc",
					},
				},
				&v1alpha1.Cluster{
					ObjectMeta: metav1.ObjectMeta{
						Name: clusterName,
					},
					Status: v1alpha1.ClusterStatus{
						ID: lo.ToPtr("123"),
					},
				},
				&v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name: repoName,
					},
					Status: v1alpha1.GitRepositoryStatus{
						Id:     lo.ToPtr("123"),
						Health: v1alpha1.GitHealthPullable,
					},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)
			fakeConsoleClient.On("GetService", mock.Anything, mock.Anything).Return(test.returnGetService, nil)
			fakeConsoleClient.On("UpdateService", mock.Anything, mock.Anything).Return(nil)

			ctx := context.Background()

			target := &reconciler.ServiceReconciler{
				Client:        fakeClient,
				Log:           ctrl.Log.WithName("reconcilers").WithName("ServiceReconciler"),
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.service}})
			assert.NoError(t, err)

			existingService := &v1alpha1.ServiceDeployment{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.service}, existingService)
			assert.NoError(t, err)
			assert.EqualValues(t, test.expectedStatus, existingService.Status)
		})
	}
}
