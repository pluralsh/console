package gitrepositorycontroller_test

import (
	"context"
	gqlclient "github.com/pluralsh/console-client-go"
	"github.com/samber/lo"
	"github.com/stretchr/testify/mock"
	"testing"

	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	gitrepositorycontroller "github.com/pluralsh/console/controller/pkg/gitrepository_controller"
	"github.com/pluralsh/console/controller/pkg/test/mocks"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
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
				Health:   "",
				Message:  nil,
				Id:       lo.ToPtr("123"),
				Sha:      "TEFHFGIB5PQMBLUWST2R6DXTY5QGH74WVGIKYQI7I3BY7BCSBDLA====",
				Existing: lo.ToPtr(false),
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
			target := &gitrepositorycontroller.Reconciler{
				Client:        fakeClient,
				Log:           ctrl.Log.WithName("controllers").WithName("GitRepoController"),
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
			assert.Equal(t, existingRepo.Status, test.expectedStatus)
		})
	}
}
