/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"fmt"

	operrors "github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	v1 "k8s.io/api/core/v1"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

func (r *PipelineReconciler) pipelineAttributes(ctx context.Context, p *v1alpha1.Pipeline, projectID *string) (*console.PipelineAttributes, error) {
	stages := make([]*console.PipelineStageAttributes, 0)
	for _, stage := range p.Spec.Stages {
		services := make([]*console.StageServiceAttributes, 0)
		for _, service := range stage.Services {
			s, err := r.pipelineStageServiceAttributes(ctx, service)
			if err != nil {
				return nil, err
			}
			services = append(services, s)
		}

		stages = append(stages, &console.PipelineStageAttributes{
			Name:     stage.Name,
			Services: services,
		})
	}

	edges := make([]*console.PipelineEdgeAttributes, 0)
	for _, edge := range p.Spec.Edges {
		gates := make([]*console.PipelineGateAttributes, 0)
		for _, gate := range edge.Gates {
			g, err := r.pipelineEdgeGateAttributes(ctx, gate)
			if err != nil {
				return nil, err
			}
			gates = append(gates, g)
		}

		edges = append(edges, &console.PipelineEdgeAttributes{
			FromID: edge.FromID,
			ToID:   edge.ToID,
			From:   edge.From,
			To:     edge.To,
			Gates:  gates,
		})
	}

	attr := &console.PipelineAttributes{
		Stages:    stages,
		Edges:     edges,
		ProjectID: projectID,
	}

	if p.Spec.Bindings != nil {
		if err := r.ensure(p); err != nil {
			return nil, err
		}
		attr.ReadBindings = policyBindings(p.Spec.Bindings.Read)
		attr.WriteBindings = policyBindings(p.Spec.Bindings.Write)
	}

	return attr, nil
}

func (r *PipelineReconciler) pipelineStageServiceAttributes(ctx context.Context, stageService v1alpha1.PipelineStageService) (*console.StageServiceAttributes, error) {
	service, err := utils.GetServiceDeployment(ctx, r.Client, stageService.ServiceRef)
	if err != nil {
		return nil, err
	}

	if service.Status.ID == nil {
		return nil, errors.NewNotFound(schema.GroupResource{Resource: "ServiceDeployment", Group: "deployments.plural.sh"}, service.Name)
	}

	// Extracting cluster ref from the service, not from the custom resource field (i.e. PipelineStageService.ClusterRef).
	// cluster, err := utils.GetCluster(ctx, r.Client, &service.Spec.ClusterRef)
	// if err != nil {
	// 	return nil, err
	// }

	criteria, err := r.pipelineStageServiceCriteriaAttributes(ctx, stageService.Criteria)
	if err != nil {
		return nil, err
	}

	return &console.StageServiceAttributes{
		// Handle:    cluster.Status.ID, // Using cluster ID instead of handle.
		Name:      nil, // Using ServiceID instead.
		ServiceID: service.Status.ID,
		Criteria:  criteria,
	}, nil
}

func (r *PipelineReconciler) pipelineStageServiceCriteriaAttributes(ctx context.Context, criteria *v1alpha1.PipelineStageServicePromotionCriteria) (*console.PromotionCriteriaAttributes, error) {
	if criteria == nil {
		return nil, nil
	}
	if criteria.ServiceRef == nil && criteria.PrAutomationRef == nil {
		return nil, nil
	}

	var sourceID *string
	var prAutomationID *string
	if criteria.PrAutomationRef != nil {
		prAutomation, err := utils.GetPrAutomation(ctx, r.Client, criteria.PrAutomationRef)
		if err != nil {
			return nil, err
		}

		if prAutomation.Status.ID == nil {
			return nil, fmt.Errorf("pr automation %s is not yet ready", prAutomation.Name)
		}

		prAutomationID = prAutomation.Status.ID
	}
	if criteria.ServiceRef != nil {
		service, err := utils.GetServiceDeployment(ctx, r.Client, criteria.ServiceRef)
		if err != nil {
			return nil, err
		}
		sourceID = service.Status.ID
	}

	return &console.PromotionCriteriaAttributes{
		SourceID:       sourceID,
		PrAutomationID: prAutomationID,
		Secrets:        criteria.Secrets,
		Repository:     criteria.Repository,
	}, nil
}

func (r *PipelineReconciler) pipelineEdgeGateAttributes(ctx context.Context, gate v1alpha1.PipelineGate) (*console.PipelineGateAttributes, error) {
	clusterRef, err := r.pipelineEdgeGateClusterIDAttribute(ctx, gate.ClusterRef)
	if err != nil {
		return nil, err
	}

	spec, err := r.pipelineEdgeGateSpecAttributes(gate.Spec)
	if err != nil {
		return nil, err
	}

	return &console.PipelineGateAttributes{
		Name:      gate.Name,
		Type:      gate.Type,
		Cluster:   nil, // Using ClusterID instead.
		ClusterID: clusterRef,
		Spec:      spec,
	}, nil
}

func (r *PipelineReconciler) pipelineEdgeGateClusterIDAttribute(ctx context.Context, clusterRef *v1.ObjectReference) (*string, error) {
	if clusterRef == nil {
		return nil, nil
	}

	cluster, err := utils.GetCluster(ctx, r.Client, clusterRef)
	if err != nil {
		return nil, err
	}

	return cluster.Status.ID, nil
}

func (r *PipelineReconciler) pipelineEdgeGateSpecAttributes(spec *v1alpha1.GateSpec) (*console.GateSpecAttributes, error) {
	if spec == nil {
		return nil, nil
	}

	job, err := gateJobAttributes(spec.Job)
	if err != nil {
		return nil, err
	}

	return &console.GateSpecAttributes{
		Job: job,
	}, nil
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *PipelineReconciler) ensure(p *v1alpha1.Pipeline) error {
	if p.Spec.Bindings == nil {
		return nil
	}

	bindings, req, err := ensureBindings(p.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}

	p.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(p.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}

	p.Spec.Bindings.Write = bindings

	if req || req2 {
		return operrors.ErrRetriable
	}

	return nil
}
