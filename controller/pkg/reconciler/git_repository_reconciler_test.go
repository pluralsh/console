package reconciler_test

import (
	"context"
	"encoding/json"
	"testing"

	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/pkg/reconciler"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"

	"github.com/pluralsh/console/controller/api/deployments/v1alpha1"
	"github.com/pluralsh/console/controller/pkg/test/mocks"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/client-go/kubernetes/scheme"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func init() {
	utilruntime.Must(v1alpha1.AddToScheme(scheme.Scheme))
}

func TestCreateNewRepository(t *testing.T) {
	tests := []struct {
		name                        string
		repository                  string
		returnGetRepository         *gqlclient.GetGitRepository
		returnErrorGetRepository    error
		returnCreateRepository      *gqlclient.CreateGitRepository
		returnErrorCreateRepository error
		existingObjects             []ctrlruntimeclient.Object
		expectedStatus              v1alpha1.GitRepositoryStatus
	}{
		{
			name:       "scenario 1: create a new repository",
			repository: "test",
			expectedStatus: v1alpha1.GitRepositoryStatus{
				ID:  lo.ToPtr("123"),
				SHA: lo.ToPtr("TEFHFGIB5PQMBLUWST2R6DXTY5QGH74WVGIKYQI7I3BY7BCSBDLA===="),
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
			returnGetRepository: &gqlclient.GetGitRepository{
				GitRepository: nil,
			},
			returnCreateRepository: &gqlclient.CreateGitRepository{
				CreateGitRepository: &gqlclient.GitRepositoryFragment{
					ID: "123",
				},
			},
			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name: "test",
					},
					Spec: v1alpha1.GitRepositorySpec{
						Url: "https://test",
						CredentialsRef: &corev1.SecretReference{
							Name: "testsecret",
						},
					},
				},
				&corev1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name: "testsecret",
					},
					Data: map[string][]byte{"z": {1, 2, 3}, "a": {4, 5, 6}},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// setup the test scenario
			fakeClient := fake.
				NewClientBuilder().
				WithScheme(scheme.Scheme).
				WithObjects(test.existingObjects...).
				Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)

			// act
			ctx := context.Background()
			target := &reconciler.GitRepositoryReconciler{
				Client:        fakeClient,
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			fakeConsoleClient.On("GetRepository", mock.AnythingOfType("*string")).Return(test.returnGetRepository, test.returnErrorGetRepository)
			fakeConsoleClient.On("CreateRepository", mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).Return(test.returnCreateRepository, test.returnErrorCreateRepository)
			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.repository}})
			assert.NoError(t, err)
			existingRepo := &v1alpha1.GitRepository{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.repository}, existingRepo)
			assert.NoError(t, err)
			existingStatusJson, err := json.Marshal(sanitizeRepoConditions(existingRepo.Status))
			assert.NoError(t, err)
			expectedStatusJson, err := json.Marshal(sanitizeRepoConditions(test.expectedStatus))
			assert.NoError(t, err)
			assert.NoError(t, err)
			assert.EqualValues(t, string(expectedStatusJson), string(existingStatusJson))
		})
	}
}

func TestUpdateRepository(t *testing.T) {
	tests := []struct {
		name                     string
		repository               string
		returnGetRepository      *gqlclient.GetGitRepository
		returnErrorGetRepository error
		existingObjects          []ctrlruntimeclient.Object
		expectedStatus           v1alpha1.GitRepositoryStatus
	}{
		{
			name:       "scenario 1: update credentials",
			repository: "test",
			expectedStatus: v1alpha1.GitRepositoryStatus{
				ID:  lo.ToPtr("123"),
				SHA: lo.ToPtr("TEFHFGIB5PQMBLUWST2R6DXTY5QGH74WVGIKYQI7I3BY7BCSBDLA===="),
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
			returnGetRepository: &gqlclient.GetGitRepository{
				GitRepository: &gqlclient.GitRepositoryFragment{
					ID: "123",
				},
			},

			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name: "test",
					},
					Spec: v1alpha1.GitRepositorySpec{
						Url: "https://test",
						CredentialsRef: &corev1.SecretReference{
							Name: "testsecret",
						},
					},
					Status: v1alpha1.GitRepositoryStatus{
						Health:  "",
						Message: nil,
						ID:      lo.ToPtr("123"),
						SHA:     lo.ToPtr("ABC"),
					},
				},
				&corev1.Secret{
					ObjectMeta: metav1.ObjectMeta{
						Name: "testsecret",
					},
					Data: map[string][]byte{"z": {1, 2, 3}, "a": {4, 5, 6}},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// setup the test scenario
			fakeClient := fake.
				NewClientBuilder().
				WithScheme(scheme.Scheme).
				WithObjects(test.existingObjects...).
				Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)

			// act
			ctx := context.Background()
			target := &reconciler.GitRepositoryReconciler{
				Client:        fakeClient,
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			fakeConsoleClient.On("GetRepository", mock.AnythingOfType("*string")).Return(test.returnGetRepository, test.returnErrorGetRepository)
			fakeConsoleClient.On("UpdateRepository", mock.Anything, mock.Anything).Return(&gqlclient.UpdateGitRepository{}, nil)
			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.repository}})
			assert.NoError(t, err)
			existingRepo := &v1alpha1.GitRepository{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.repository}, existingRepo)
			assert.NoError(t, err)
			existingStatusJson, err := json.Marshal(sanitizeRepoConditions(existingRepo.Status))
			assert.NoError(t, err)
			expectedStatusJson, err := json.Marshal(sanitizeRepoConditions(test.expectedStatus))
			assert.NoError(t, err)
			assert.NoError(t, err)
			assert.EqualValues(t, string(expectedStatusJson), string(existingStatusJson))
		})
	}
}

func TestImportRepository(t *testing.T) {
	tests := []struct {
		name                     string
		repository               string
		returnGetRepository      *gqlclient.GetGitRepository
		returnErrorGetRepository error
		existingObjects          []ctrlruntimeclient.Object
		expectedStatus           v1alpha1.GitRepositoryStatus
	}{
		{
			name:       "scenario 1: update credentials",
			repository: "test",
			expectedStatus: v1alpha1.GitRepositoryStatus{
				ID: lo.ToPtr("123"),
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
			returnGetRepository: &gqlclient.GetGitRepository{
				GitRepository: &gqlclient.GitRepositoryFragment{
					ID: "123",
				},
			},

			existingObjects: []ctrlruntimeclient.Object{
				&v1alpha1.GitRepository{
					ObjectMeta: metav1.ObjectMeta{
						Name: "test",
					},
					Spec: v1alpha1.GitRepositorySpec{
						Url: "https://test",
					},
				},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// setup the test scenario
			fakeClient := fake.
				NewClientBuilder().
				WithScheme(scheme.Scheme).
				WithObjects(test.existingObjects...).
				Build()

			fakeConsoleClient := mocks.NewConsoleClient(t)

			// act
			ctx := context.Background()
			target := &reconciler.GitRepositoryReconciler{
				Client:        fakeClient,
				Scheme:        scheme.Scheme,
				ConsoleClient: fakeConsoleClient,
			}

			fakeConsoleClient.On("GetRepository", mock.AnythingOfType("*string")).Return(test.returnGetRepository, test.returnErrorGetRepository)
			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.repository}})
			assert.NoError(t, err)
			existingRepo := &v1alpha1.GitRepository{}
			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.repository}, existingRepo)
			assert.NoError(t, err)
			existingStatusJson, err := json.Marshal(sanitizeRepoConditions(existingRepo.Status))
			assert.NoError(t, err)
			expectedStatusJson, err := json.Marshal(sanitizeRepoConditions(test.expectedStatus))
			assert.NoError(t, err)
			assert.NoError(t, err)
			assert.EqualValues(t, string(expectedStatusJson), string(existingStatusJson))
		})
	}
}

func sanitizeRepoConditions(status v1alpha1.GitRepositoryStatus) v1alpha1.GitRepositoryStatus {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	return status
}
