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

package pod

import (
	"encoding/base64"
	"testing"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"

	"github.com/stretchr/testify/require"

	metricapi "github.com/pluralsh/kubernetes-agent/api/pkg/integration/metric/api"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/common"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/controller"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/dataselect"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/persistentvolumeclaim"
	"github.com/pluralsh/kubernetes-agent/common/types"
)

func TestGetPodDetail(t *testing.T) {
	cases := []struct {
		pod      *v1.PodList
		expected *PodDetail
	}{
		{
			pod: &v1.PodList{Items: []v1.Pod{{
				ObjectMeta: metaV1.ObjectMeta{
					Name: "test-pod", Namespace: "test-namespace",
					Labels: map[string]string{"app": "test"},
				},
			}}},
			expected: &PodDetail{
				TypeMeta: types.TypeMeta{Kind: types.ResourceKindPod},
				ObjectMeta: types.ObjectMeta{
					Name:      "test-pod",
					Namespace: "test-namespace",
					Labels:    map[string]string{"app": "test"},
				},
				Controller:     &controller.ResourceOwner{},
				Containers:     []Container{},
				InitContainers: []Container{},
				EventList: common.EventList{
					Events: []common.Event{},
					Errors: []error{},
				},
				Metrics:                   []metricapi.Metric{},
				PersistentvolumeclaimList: persistentvolumeclaim.PersistentVolumeClaimList{},
				Errors:                    []error{},
				Conditions:                make([]common.Condition, 0),
			},
		},
	}

	for _, c := range cases {
		fakeClient := fake.NewClientset(c.pod)

		dataselect.DefaultDataSelectWithMetrics.MetricQuery = dataselect.NoMetrics
		actual, err := GetPodDetail(fakeClient, nil, "test-namespace", "test-pod")

		require.NoError(t, err)
		require.Equal(t, c.expected, actual)
	}
}

func TestEvalValueFrom(t *testing.T) {
	cases := []struct {
		src        *v1.EnvVarSource
		container  *v1.Container
		pod        *v1.Pod
		configMaps *v1.ConfigMapList
		secrets    *v1.SecretList
		expected   string
	}{
		{
			src: &v1.EnvVarSource{
				SecretKeyRef: &v1.SecretKeySelector{
					LocalObjectReference: v1.LocalObjectReference{
						Name: "secret-env",
					},
					Key: "username",
				},
			},
			container:  nil,
			pod:        nil,
			configMaps: nil,
			secrets: &v1.SecretList{
				Items: []v1.Secret{
					{
						ObjectMeta: metaV1.ObjectMeta{
							Name: "secret-env",
						},
						Data: map[string][]byte{
							"username": []byte("top-secret"),
						},
					},
				},
			},
			expected: base64.StdEncoding.EncodeToString([]byte("top-secret")),
		},
		{
			src: &v1.EnvVarSource{
				ConfigMapKeyRef: &v1.ConfigMapKeySelector{
					LocalObjectReference: v1.LocalObjectReference{
						Name: "config-map-env",
					},
					Key: "username",
				},
			},
			container: nil,
			pod:       nil,
			configMaps: &v1.ConfigMapList{
				Items: []v1.ConfigMap{
					{
						ObjectMeta: metaV1.ObjectMeta{
							Name: "config-map-env",
						},
						Data: map[string]string{
							"username": "joey",
						},
					},
				},
			},
			secrets:  nil,
			expected: "joey",
		},
	}

	for _, c := range cases {
		dataselect.DefaultDataSelectWithMetrics.MetricQuery = dataselect.NoMetrics
		actual := evalValueFrom(c.src, c.container, c.pod, c.configMaps, c.secrets)
		require.Equal(t, c.expected, actual)
	}
}

func TestEvalEnvFrom(t *testing.T) {
	cases := []struct {
		container  v1.Container
		configMaps *v1.ConfigMapList
		secrets    *v1.SecretList
		expected   []EnvVar
	}{
		{
			container: v1.Container{
				Name:  "echoserver",
				Image: "registry.k8s.io/echoserver",
				EnvFrom: []v1.EnvFromSource{
					{
						SecretRef: &v1.SecretEnvSource{
							LocalObjectReference: v1.LocalObjectReference{
								Name: "secret-env",
							},
						},
					}, {
						Prefix: "test_",
						ConfigMapRef: &v1.ConfigMapEnvSource{
							LocalObjectReference: v1.LocalObjectReference{
								Name: "config-map-env",
							},
						},
					},
				},
			},
			configMaps: &v1.ConfigMapList{
				Items: []v1.ConfigMap{
					{
						ObjectMeta: metaV1.ObjectMeta{
							Name: "config-map-env",
						},
						Data: map[string]string{
							"username": "joey",
						},
					},
				},
			},
			secrets: &v1.SecretList{
				Items: []v1.Secret{
					{
						ObjectMeta: metaV1.ObjectMeta{
							Name: "secret-env",
						},
						Data: map[string][]byte{
							"username": []byte("top-secret"),
						},
					},
				},
			},
			expected: []EnvVar{
				{
					Name:  "username",
					Value: base64.StdEncoding.EncodeToString([]byte("top-secret")),
					ValueFrom: &v1.EnvVarSource{
						SecretKeyRef: &v1.SecretKeySelector{
							LocalObjectReference: v1.LocalObjectReference{
								Name: "secret-env",
							},
							Key: "username",
						},
					},
				},
				{
					Name:  "test_username",
					Value: "joey",
					ValueFrom: &v1.EnvVarSource{
						ConfigMapKeyRef: &v1.ConfigMapKeySelector{
							LocalObjectReference: v1.LocalObjectReference{
								Name: "config-map-env",
							},
							Key: "username",
						},
					},
				},
			},
		},
	}

	for _, c := range cases {
		dataselect.DefaultDataSelectWithMetrics.MetricQuery = dataselect.NoMetrics
		actual := evalEnvFrom(c.container, c.configMaps, c.secrets)
		require.Equal(t, c.expected, actual)
	}
}
