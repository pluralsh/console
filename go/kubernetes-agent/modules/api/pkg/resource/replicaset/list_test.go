// Copyright 2017 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package replicaset

import (
	"testing"

	apps "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"

	"github.com/stretchr/testify/require"

	metricapi "github.com/pluralsh/kubernetes-agent/api/pkg/integration/metric/api"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/common"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/dataselect"
	"github.com/pluralsh/kubernetes-agent/common/errors"
	"github.com/pluralsh/kubernetes-agent/common/types"
)

func TestGetReplicaSetListFromChannels(t *testing.T) {
	replicas := int32(21)
	controller := true
	cases := []struct {
		k8sRs         apps.ReplicaSetList
		k8sRsError    error
		pods          *v1.PodList
		expected      *ReplicaSetList
		expectedError error
	}{
		{
			apps.ReplicaSetList{},
			nil,
			&v1.PodList{},
			&ReplicaSetList{
				ListMeta:          types.ListMeta{},
				CumulativeMetrics: make([]metricapi.Metric, 0),
				ReplicaSets:       []ReplicaSet{},
				Errors:            []error{},
			},
			nil,
		},
		{
			apps.ReplicaSetList{},
			errors.NewInvalid("MyCustomError"),
			&v1.PodList{},
			nil,
			errors.NewInvalid("MyCustomError"),
		},
		{
			apps.ReplicaSetList{},
			&k8serrors.StatusError{},
			&v1.PodList{},
			nil,
			&k8serrors.StatusError{},
		},
		{
			apps.ReplicaSetList{},
			&k8serrors.StatusError{ErrStatus: metaV1.Status{}},
			&v1.PodList{},
			nil,
			&k8serrors.StatusError{ErrStatus: metaV1.Status{}},
		},
		{
			apps.ReplicaSetList{},
			&k8serrors.StatusError{ErrStatus: metaV1.Status{Reason: "foo-bar"}},
			&v1.PodList{},
			nil,
			&k8serrors.StatusError{ErrStatus: metaV1.Status{Reason: "foo-bar"}},
		},
		{
			apps.ReplicaSetList{
				Items: []apps.ReplicaSet{{
					ObjectMeta: metaV1.ObjectMeta{
						Name:              "rs-name",
						Namespace:         "rs-namespace",
						Labels:            map[string]string{"key": "value"},
						UID:               "uid",
						CreationTimestamp: metaV1.Unix(111, 222),
					},
					Spec: apps.ReplicaSetSpec{
						Selector: &metaV1.LabelSelector{MatchLabels: map[string]string{"foo": "bar"}},
						Replicas: &replicas,
					},
					Status: apps.ReplicaSetStatus{
						Replicas: 7,
					},
				}},
			},
			nil,
			&v1.PodList{
				Items: []v1.Pod{
					{
						ObjectMeta: metaV1.ObjectMeta{
							Namespace: "rs-namespace",
							OwnerReferences: []metaV1.OwnerReference{
								{
									Name:       "rs-name",
									UID:        "uid",
									Controller: &controller,
								},
							},
						},
						Status: v1.PodStatus{Phase: v1.PodFailed},
					},
					{
						ObjectMeta: metaV1.ObjectMeta{
							Namespace: "rs-namespace",
							OwnerReferences: []metaV1.OwnerReference{
								{
									Name:       "rs-name-wrong",
									UID:        "uid-wrong",
									Controller: &controller,
								},
							},
						},
						Status: v1.PodStatus{Phase: v1.PodFailed},
					},
				},
			},
			&ReplicaSetList{
				ListMeta:          types.ListMeta{TotalItems: 1},
				CumulativeMetrics: make([]metricapi.Metric, 0),
				Status:            common.ResourceStatus{Running: 1},
				ReplicaSets: []ReplicaSet{{
					ContainerImages:     make([]string, 0),
					InitContainerImages: make([]string, 0),
					ObjectMeta: types.ObjectMeta{
						Name:              "rs-name",
						Namespace:         "rs-namespace",
						UID:               "uid",
						Labels:            map[string]string{"key": "value"},
						CreationTimestamp: metaV1.Unix(111, 222),
					},
					TypeMeta: types.TypeMeta{Kind: types.ResourceKindReplicaSet, Scalable: true},
					Pods: common.PodInfo{
						Current:  7,
						Desired:  &replicas,
						Failed:   1,
						Warnings: []common.Event{},
					},
				}},
				Errors: []error{},
			},
			nil,
		},
	}

	for _, c := range cases {
		channels := &common.ResourceChannels{
			ReplicaSetList: common.ReplicaSetListChannel{
				List:  make(chan *apps.ReplicaSetList, 1),
				Error: make(chan error, 1),
			},
			NodeList: common.NodeListChannel{
				List:  make(chan *v1.NodeList, 1),
				Error: make(chan error, 1),
			},
			ServiceList: common.ServiceListChannel{
				List:  make(chan *v1.ServiceList, 1),
				Error: make(chan error, 1),
			},
			PodList: common.PodListChannel{
				List:  make(chan *v1.PodList, 1),
				Error: make(chan error, 1),
			},
			EventList: common.EventListChannel{
				List:  make(chan *v1.EventList, 1),
				Error: make(chan error, 1),
			},
		}

		channels.ReplicaSetList.Error <- c.k8sRsError
		channels.ReplicaSetList.List <- &c.k8sRs

		channels.NodeList.List <- &v1.NodeList{}
		channels.NodeList.Error <- nil

		channels.ServiceList.List <- &v1.ServiceList{}
		channels.ServiceList.Error <- nil

		channels.PodList.List <- c.pods
		channels.PodList.Error <- nil

		channels.EventList.List <- &v1.EventList{}
		channels.EventList.Error <- nil

		actual, err := GetReplicaSetListFromChannels(channels, dataselect.NoDataSelect, nil)
		require.Equal(t, c.expected, actual)
		require.Equal(t, c.expectedError, err)
	}
}

func TestToReplicaSetList(t *testing.T) {
	replicas := int32(0)
	cases := []struct {
		replicaSets []apps.ReplicaSet
		pods        []v1.Pod
		events      []v1.Event
		expected    *ReplicaSetList
	}{
		{
			[]apps.ReplicaSet{
				{
					ObjectMeta: metaV1.ObjectMeta{Name: "replica-set", Namespace: "ns-1"},
					Spec: apps.ReplicaSetSpec{
						Replicas: &replicas,
						Selector: &metaV1.LabelSelector{
							MatchLabels: map[string]string{"key": "value"},
						}},
				},
			},
			[]v1.Pod{},
			[]v1.Event{},
			&ReplicaSetList{
				ListMeta:          types.ListMeta{TotalItems: 1},
				CumulativeMetrics: make([]metricapi.Metric, 0),
				ReplicaSets: []ReplicaSet{
					{
						InitContainerImages: make([]string, 0),
						ContainerImages:     make([]string, 0),
						ObjectMeta:          types.ObjectMeta{Name: "replica-set", Namespace: "ns-1"},
						TypeMeta:            types.TypeMeta{Kind: types.ResourceKindReplicaSet, Scalable: true},
						Pods: common.PodInfo{
							Warnings: []common.Event{},
							Desired:  &replicas,
						},
					},
				},
			},
		},
	}

	for _, c := range cases {
		actual := ToReplicaSetList(c.replicaSets, c.pods, c.events, nil, dataselect.NoDataSelect, nil)
		require.Equal(t, c.expected, actual)
	}
}

func TestGetReplicaSetList(t *testing.T) {
	replicas := int32(21)
	cases := []struct {
		rsList          *apps.ReplicaSetList
		expectedActions []string
		expected        *ReplicaSetList
	}{
		{
			rsList: &apps.ReplicaSetList{
				Items: []apps.ReplicaSet{
					{
						ObjectMeta: metaV1.ObjectMeta{
							Name:   "rs-1",
							Labels: map[string]string{},
						},
						Spec: apps.ReplicaSetSpec{
							Replicas: &replicas,
						},
					},
				}},
			expectedActions: []string{"list", "list", "list"},
			expected: &ReplicaSetList{
				ListMeta: types.ListMeta{TotalItems: 1},
				Status:   common.ResourceStatus{Running: 1},
				ReplicaSets: []ReplicaSet{
					{
						ContainerImages:     make([]string, 0),
						InitContainerImages: make([]string, 0),
						ObjectMeta: types.ObjectMeta{
							Name:   "rs-1",
							Labels: map[string]string{},
						},
						TypeMeta: types.TypeMeta{Kind: types.ResourceKindReplicaSet, Scalable: true},
						Pods: common.PodInfo{
							Desired:  &replicas,
							Warnings: make([]common.Event, 0),
						},
					},
				},
				Errors:            []error{},
				CumulativeMetrics: make([]metricapi.Metric, 0),
			},
		},
	}

	for _, c := range cases {
		fakeClient := fake.NewClientset(c.rsList)
		actual, _ := GetReplicaSetList(fakeClient, &common.NamespaceQuery{}, dataselect.NoDataSelect, nil)
		actions := fakeClient.Actions()

		if len(actions) != len(c.expectedActions) {
			t.Errorf("Unexpected actions: %v, expected %d actions got %d", actions,
				len(c.expectedActions), len(actions))
			continue
		}

		for i, verb := range c.expectedActions {
			if actions[i].GetVerb() != verb {
				t.Errorf("Unexpected action: %+v, expected %s", actions[i], verb)
			}
		}

		require.Equal(t, c.expected, actual)
	}
}
