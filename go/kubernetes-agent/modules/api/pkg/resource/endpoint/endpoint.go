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

package endpoint

import (
	discoveryv1 "k8s.io/api/discovery/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
	k8sClient "k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"

	"github.com/pluralsh/kubernetes-agent/api/pkg/args"
	"github.com/pluralsh/kubernetes-agent/api/pkg/resource/common"
	"github.com/pluralsh/kubernetes-agent/common/types"
)

type Endpoint struct {
	ObjectMeta types.ObjectMeta `json:"objectMeta"`
	TypeMeta   types.TypeMeta   `json:"typeMeta"`

	// Hostname, either as a domain name or IP address.
	Host string `json:"host"`

	// Name of the node the endpoint is located
	NodeName *string `json:"nodeName"`

	// Status of the endpoint
	Ready bool `json:"ready"`

	// Array of endpoint ports
	Ports []discoveryv1.EndpointPort `json:"ports"`
}

// GetServiceEndpoints gets list of endpoints targeted by given label selector in given namespace.
func GetServiceEndpoints(client k8sClient.Interface, namespace, name string) (*EndpointList, error) {
	endpointList := &EndpointList{
		Endpoints: make([]Endpoint, 0),
		ListMeta:  types.ListMeta{TotalItems: 0},
	}

	serviceEndpoints, err := GetEndpoints(client, namespace, name)
	if err != nil {
		return endpointList, err
	}

	endpointList = toEndpointList(serviceEndpoints)
	klog.V(args.LogLevelVerbose).Infof("Found %d endpoints related to %s service in %s namespace", len(endpointList.Endpoints), name, namespace)
	return endpointList, nil
}

// GetEndpoints gets endpoints associated to resource with given name.
func GetEndpoints(client k8sClient.Interface, namespace, name string) ([]discoveryv1.EndpointSlice, error) {
	fieldSelector, err := fields.ParseSelector("metadata.name" + "=" + name)
	if err != nil {
		return nil, err
	}

	channels := &common.ResourceChannels{
		EndpointList: common.GetEndpointListChannelWithOptions(client,
			common.NewSameNamespaceQuery(namespace),
			metaV1.ListOptions{
				LabelSelector: labels.Everything().String(),
				FieldSelector: fieldSelector.String(),
			},
			1),
	}

	endpointList := <-channels.EndpointList.List
	if err := <-channels.EndpointList.Error; err != nil {
		return nil, err
	}

	return endpointList.Items, nil
}
