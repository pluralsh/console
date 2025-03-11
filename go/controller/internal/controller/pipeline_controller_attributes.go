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

	"github.com/pluralsh/console/go/controller/internal/errors"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"

	v1 "k8s.io/api/core/v1"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

func (r *PipelineReconciler) pipelineAttributes(ctx context.Context, p *v1alpha1.Pipeline, projectID *string) (*console.PipelineAttributes, *ctrl.Result, error) {
	stages := make([]*console.PipelineStageAttributes, 0)
	for _, stage := range p.Spec.Stages {
		services := make([]*console.StageServiceAttributes, 0)
		for _, service := range stage.Services {
			s, result, err := r.pipelineStageServiceAttributes(ctx, service)
			if result != nil || err != nil {
				return nil, result, err
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
			g, result, err := r.pipelineEdgeGateAttributes(ctx, gate)
			if result != nil || err != nil {
				return nil, result, err
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

	if p.Spec.FlowRef != nil {
		flow := &v1alpha1.Flow{}
		ns := p.Spec.FlowRef.Namespace
		if ns == "" {
			ns = p.Namespace
		}
		nsn := types.NamespacedName{Name: p.Spec.FlowRef.Name, Namespace: ns}
		if err := r.Get(ctx, nsn, flow); err != nil {
			return nil, &requeue, fmt.Errorf("error while getting flow: %s", err.Error())
		}
		if !flow.Status.HasID() {
			return nil, &waitForResources, fmt.Errorf("flow is not ready")
		}
		attr.FlowID = flow.Status.ID
	}

	if p.Spec.Bindings != nil {
		result, err := r.ensure(p)
		if result != nil || err != nil {
			return nil, result, err
		}

		attr.ReadBindings = policyBindings(p.Spec.Bindings.Read)
		attr.WriteBindings = policyBindings(p.Spec.Bindings.Write)
	}

	return attr, nil, nil
}

func (r *PipelineReconciler) pipelineStageServiceAttributes(ctx context.Context, stageService v1alpha1.PipelineStageService) (*console.StageServiceAttributes, *ctrl.Result, error) {
	service, err := utils.GetServiceDeployment(ctx, r.Client, stageService.ServiceRef)
	if err != nil {
		return nil, nil, err
	}

	if !service.Status.HasID() {
		return nil, &waitForResources, fmt.Errorf("service is not ready")
	}

	// Extracting cluster ref from the service, not from the custom resource field (i.e. PipelineStageService.ClusterRef).
	// cluster, err := utils.GetCluster(ctx, r.Client, &service.Spec.ClusterRef)
	// if err != nil {
	// 	return nil, err
	// }

	criteria, result, err := r.pipelineStageServiceCriteriaAttributes(ctx, stageService.Criteria)
	if result != nil || err != nil {
		return nil, result, err
	}

	return &console.StageServiceAttributes{
		// Handle:    cluster.Status.ID, // Using cluster ID instead of handle.
		Name:      nil, // Using ServiceID instead.
		ServiceID: service.Status.ID,
		Criteria:  criteria,
	}, nil, nil
}

func (r *PipelineReconciler) pipelineStageServiceCriteriaAttributes(ctx context.Context, criteria *v1alpha1.PipelineStageServicePromotionCriteria) (*console.PromotionCriteriaAttributes, *ctrl.Result, error) {
	if criteria == nil || (criteria.ServiceRef == nil && criteria.PrAutomationRef == nil) {
		return nil, nil, nil
	}

	var sourceID *string
	var prAutomationID *string
	if criteria.PrAutomationRef != nil {
		prAutomation, err := utils.GetPrAutomation(ctx, r.Client, criteria.PrAutomationRef)
		if err != nil {
			return nil, nil, err
		}

		if !prAutomation.Status.HasID() {
			return nil, &waitForResources, fmt.Errorf("pr automation is not ready")
		}

		prAutomationID = prAutomation.Status.ID
	}
	if criteria.ServiceRef != nil {
		service, err := utils.GetServiceDeployment(ctx, r.Client, criteria.ServiceRef)
		if err != nil {
			return nil, nil, err
		}
		sourceID = service.Status.ID
	}

	return &console.PromotionCriteriaAttributes{
		SourceID:       sourceID,
		PrAutomationID: prAutomationID,
		Secrets:        criteria.Secrets,
		Repository:     criteria.Repository,
	}, nil, nil
}

func (r *PipelineReconciler) pipelineEdgeGateAttributes(ctx context.Context, gate v1alpha1.PipelineGate) (*console.PipelineGateAttributes, *ctrl.Result, error) {
	clusterId, result, err := r.pipelineEdgeGateClusterIDAttribute(ctx, gate.ClusterRef)
	if result != nil || err != nil {
		return nil, result, err
	}

	spec, err := r.pipelineEdgeGateSpecAttributes(gate.Spec)
	if err != nil {
		return nil, nil, err
	}

	return &console.PipelineGateAttributes{
		Name:      gate.Name,
		Type:      gate.Type,
		ClusterID: clusterId,
		Spec:      spec,
	}, nil, nil
}

func (r *PipelineReconciler) pipelineEdgeGateClusterIDAttribute(ctx context.Context, clusterRef *v1.ObjectReference) (*string, *ctrl.Result, error) {
	if clusterRef == nil {
		return nil, nil, nil
	}

	cluster, err := utils.GetCluster(ctx, r.Client, clusterRef)
	if err != nil {
		return nil, nil, err
	}

	if !cluster.Status.HasID() {
		return nil, &waitForResources, fmt.Errorf("cluster is not ready")
	}

	return cluster.Status.ID, nil, nil
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
func (r *PipelineReconciler) ensure(p *v1alpha1.Pipeline) (*ctrl.Result, error) {
	if p.Spec.Bindings == nil {
		return nil, nil
	}

	bindings, req, err := ensureBindings(p.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return nil, err
	}
	p.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(p.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return nil, err
	}
	p.Spec.Bindings.Write = bindings

	if req || req2 {
		return &waitForResources, errors.ErrRetriable
	}

	return nil, nil
}
