package controller_test

//func TestUpdateCluster(t *testing.T) {
//	const (
//		clusterName       = "test-cluster"
//		clusterConsoleID  = "12345-67890"
//		providerName      = "test-provider"
//		providerNamespace = "test-provider"
//		providerConsoleID = "12345-67890"
//	)
//
//	tests := []struct {
//		name                     string
//		cluster                  string
//		returnIsClusterExisting  bool
//		returnUpdateCluster      *gqlclient.ClusterFragment
//		returnErrorUpdateCluster error
//		existingObjects          []ctrlruntimeclient.Object
//		expectedStatus           v1alpha1.ClusterStatus
//	}{
//		{
//			name:    "scenario 1: update AWS cluster",
//			cluster: clusterName,
//			expectedStatus: v1alpha1.ClusterStatus{
//				ID:  lo.ToPtr(clusterConsoleID),
//				SHA: lo.ToPtr("DU5PTA62PGOS35CPPCNSRG6PGXUUIWTXVBK5BFXCCGCAAM2K6HYA===="),
//				Conditions: []metav1.Condition{
//					{
//						Type:   v1alpha1.ReadonlyConditionType.String(),
//						Status: metav1.ConditionFalse,
//						Reason: v1alpha1.ReadonlyConditionReason.String(),
//					},
//					{
//						Type:   v1alpha1.ReadyConditionType.String(),
//						Status: metav1.ConditionTrue,
//						Reason: v1alpha1.ReadyConditionReason.String(),
//					},
//				},
//			},
//			returnIsClusterExisting: true,
//			returnUpdateCluster:     &gqlclient.ClusterFragment{ID: clusterConsoleID},
//			existingObjects: []ctrlruntimeclient.Object{
//				&v1alpha1.Cluster{
//					ObjectMeta: metav1.ObjectMeta{Name: clusterName},
//					Spec: v1alpha1.ClusterSpec{
//						Handle:      lo.ToPtr(clusterName),
//						Version:     lo.ToPtr("1.24"),
//						Cloud:       "aws",
//						ProviderRef: &corev1.ObjectReference{Name: providerName},
//					},
//					Status: v1alpha1.ClusterStatus{
//						ID:  lo.ToPtr(clusterConsoleID),
//						SHA: lo.ToPtr("XGLLQCLXY5LEQV2UAQDUSOZ2MN24L67HDIGWRK2MA5STBBRNMVDA===="),
//						Conditions: []metav1.Condition{
//							{
//								Type:   v1alpha1.ReadonlyConditionType.String(),
//								Status: metav1.ConditionFalse,
//								Reason: v1alpha1.ReadonlyConditionReason.String(),
//							},
//							{
//								Type:   v1alpha1.ReadyConditionType.String(),
//								Status: metav1.ConditionTrue,
//								Reason: v1alpha1.ReadyConditionReason.String(),
//							},
//						},
//					},
//				},
//				&v1alpha1.Provider{
//					ObjectMeta: metav1.ObjectMeta{Name: providerName},
//					Spec: v1alpha1.ProviderSpec{
//						Cloud:     "aws",
//						Name:      providerName,
//						Namespace: providerNamespace,
//					},
//					Status: v1alpha1.ProviderStatus{ID: lo.ToPtr(providerConsoleID)},
//				},
//			},
//		},
//		{
//			name:    "scenario 2: update BYOK cluster",
//			cluster: clusterName,
//			expectedStatus: v1alpha1.ClusterStatus{
//				ID:  lo.ToPtr(clusterConsoleID),
//				SHA: lo.ToPtr("XGLLQCLXY5LEQV2UAQDUSOZ2MN24L67HDIGWRK2MA5STBBRNMVDA===="),
//				Conditions: []metav1.Condition{
//					{
//						Type:   v1alpha1.ReadonlyConditionType.String(),
//						Status: metav1.ConditionFalse,
//						Reason: v1alpha1.ReadonlyConditionReason.String(),
//					},
//					{
//						Type:   v1alpha1.ReadyConditionType.String(),
//						Status: metav1.ConditionTrue,
//						Reason: v1alpha1.ReadyConditionReason.String(),
//					},
//				},
//			},
//			returnIsClusterExisting: true,
//			returnUpdateCluster:     &gqlclient.ClusterFragment{ID: clusterConsoleID},
//			existingObjects: []ctrlruntimeclient.Object{
//				&v1alpha1.Cluster{
//					ObjectMeta: metav1.ObjectMeta{Name: clusterName},
//					Spec: v1alpha1.ClusterSpec{
//						Handle: lo.ToPtr(clusterName),
//						Cloud:  "byok",
//					},
//					Status: v1alpha1.ClusterStatus{
//						ID:  lo.ToPtr(clusterConsoleID),
//						SHA: lo.ToPtr("DU5PTA62PGOS35CPPCNSRG6PGXUUIWTXVBK5BFXCCGCAAM2K6HYA===="),
//						Conditions: []metav1.Condition{
//							{
//								Type:   v1alpha1.ReadonlyConditionType.String(),
//								Status: metav1.ConditionFalse,
//								Reason: v1alpha1.ReadonlyConditionReason.String(),
//							},
//							{
//								Type:   v1alpha1.ReadyConditionType.String(),
//								Status: metav1.ConditionTrue,
//								Reason: v1alpha1.ReadyConditionReason.String(),
//							},
//						},
//					},
//				},
//			},
//		},
//	}
//
//	for _, test := range tests {
//		t.Run(test.name, func(t *testing.T) {
//			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()
//
//			fakeConsoleClient := mocks.NewConsoleClient(t)
//			fakeConsoleClient.On("IsClusterExisting", mock.AnythingOfType("*string")).Return(test.returnIsClusterExisting)
//			fakeConsoleClient.On("UpdateCluster", mock.AnythingOfType("string"), mock.Anything).Return(test.returnUpdateCluster, test.returnErrorUpdateCluster)
//
//			ctx := context.Background()
//
//			target := &controller.ClusterReconciler{
//				Client:        fakeClient,
//				Scheme:        scheme.Scheme,
//				ConsoleClient: fakeConsoleClient,
//			}
//
//			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.cluster}})
//			assert.NoError(t, err)
//
//			existingCluster := &v1alpha1.Cluster{}
//			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.cluster}, existingCluster)
//
//			existingStatusJson, _ := json.Marshal(sanitizeClusterStatus(existingCluster.Status))
//			expectedStatusJson, _ := json.Marshal(sanitizeClusterStatus(test.expectedStatus))
//
//			assert.NoError(t, err)
//			assert.EqualValues(t, string(expectedStatusJson), string(existingStatusJson))
//		})
//	}
//}
//
//func TestAdoptExistingCluster(t *testing.T) {
//	const (
//		clusterName      = "test-cluster"
//		clusterConsoleID = "12345-67890"
//	)
//
//	tests := []struct {
//		name                          string
//		cluster                       string
//		returnGetClusterByHandle      *gqlclient.ClusterFragment
//		returnErrorGetClusterByHandle error
//		existingObjects               []ctrlruntimeclient.Object
//		expectedStatus                v1alpha1.ClusterStatus
//	}{
//		{
//			name:    "scenario 1: adopt existing AWS cluster",
//			cluster: clusterName,
//			expectedStatus: v1alpha1.ClusterStatus{
//				ID: lo.ToPtr(clusterConsoleID),
//				Conditions: []metav1.Condition{
//					{
//						Type:    v1alpha1.ReadonlyConditionType.String(),
//						Status:  metav1.ConditionTrue,
//						Reason:  v1alpha1.ReadonlyConditionReason.String(),
//						Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
//					},
//					{
//						Type:   v1alpha1.ReadyConditionType.String(),
//						Status: metav1.ConditionTrue,
//						Reason: v1alpha1.ReadyConditionReason.String(),
//					},
//				},
//			},
//			returnGetClusterByHandle:      &gqlclient.ClusterFragment{ID: clusterConsoleID},
//			returnErrorGetClusterByHandle: nil,
//			existingObjects: []ctrlruntimeclient.Object{
//				&v1alpha1.Cluster{
//					ObjectMeta: metav1.ObjectMeta{Name: clusterName},
//					Spec:       v1alpha1.ClusterSpec{Handle: lo.ToPtr(clusterName)},
//				},
//			},
//		},
//		{
//			name:    "scenario 2: adopt existing BYOK cluster",
//			cluster: clusterName,
//			expectedStatus: v1alpha1.ClusterStatus{
//				ID:             lo.ToPtr(clusterConsoleID),
//				CurrentVersion: lo.ToPtr("1.24.11"),
//				Conditions: []metav1.Condition{
//					{
//						Type:    v1alpha1.ReadonlyConditionType.String(),
//						Status:  metav1.ConditionTrue,
//						Reason:  v1alpha1.ReadonlyConditionReason.String(),
//						Message: v1alpha1.ReadonlyTrueConditionMessage.String(),
//					},
//					{
//						Type:   v1alpha1.ReadyConditionType.String(),
//						Status: metav1.ConditionTrue,
//						Reason: v1alpha1.ReadyConditionReason.String(),
//					},
//				},
//			},
//			returnGetClusterByHandle: &gqlclient.ClusterFragment{
//				ID:             clusterConsoleID,
//				CurrentVersion: lo.ToPtr("1.24.11"),
//			},
//			returnErrorGetClusterByHandle: nil,
//			existingObjects: []ctrlruntimeclient.Object{
//				&v1alpha1.Cluster{
//					ObjectMeta: metav1.ObjectMeta{Name: clusterName},
//					Spec: v1alpha1.ClusterSpec{
//						Handle: lo.ToPtr(clusterName),
//						Cloud:  "byok",
//					},
//				},
//			},
//		},
//	}
//
//	for _, test := range tests {
//		t.Run(test.name, func(t *testing.T) {
//			fakeClient := fake.NewClientBuilder().WithScheme(scheme.Scheme).WithObjects(test.existingObjects...).Build()
//
//			fakeConsoleClient := mocks.NewConsoleClient(t)
//			fakeConsoleClient.On("GetClusterByHandle", mock.AnythingOfType("*string")).Return(test.returnGetClusterByHandle, test.returnErrorGetClusterByHandle)
//
//			ctx := context.Background()
//
//			target := &controller.ClusterReconciler{
//				Client:        fakeClient,
//				Scheme:        scheme.Scheme,
//				ConsoleClient: fakeConsoleClient,
//			}
//
//			_, err := target.Reconcile(ctx, reconcile.Request{NamespacedName: types.NamespacedName{Name: test.cluster}})
//			assert.NoError(t, err)
//
//			existingCluster := &v1alpha1.Cluster{}
//			err = fakeClient.Get(ctx, ctrlruntimeclient.ObjectKey{Name: test.cluster}, existingCluster)
//
//			existingStatusJson, _ := json.Marshal(sanitizeClusterStatus(existingCluster.Status))
//			expectedStatusJson, _ := json.Marshal(sanitizeClusterStatus(test.expectedStatus))
//
//			assert.NoError(t, err)
//			assert.EqualValues(t, string(expectedStatusJson), string(existingStatusJson))
//		})
//	}
//}
