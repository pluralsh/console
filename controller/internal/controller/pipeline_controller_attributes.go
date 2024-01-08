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

	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/utils"
)

func (r *PipelineReconciler) pipelineAttributes(ctx context.Context, p *v1alpha1.Pipeline) (*console.PipelineAttributes, error) {
	stages := make([]*console.PipelineStageAttributes, 0)
	for _, stage := range p.Spec.Stages {
		services := make([]*console.StageServiceAttributes, 0)
		for _, service := range stage.Services {
			service, err := r.pipelineStageServiceAttributes(ctx, service)
			if err != nil {
				return nil, err
			}
			services = append(services, service)
		}

		stages = append(stages, &console.PipelineStageAttributes{
			Name:     stage.Name,
			Services: services,
		})
	}

	edges := make([]*console.PipelineEdgeAttributes, 0)
	for _, edge := range p.Spec.Edges {
		edges = append(edges, &console.PipelineEdgeAttributes{
			FromID: edge.FromID,
			ToID:   edge.ToID,
			From:   edge.From,
			To:     edge.To,
			Gates:  nil,
		})
	}

	return &console.PipelineAttributes{
		Stages: stages,
		Edges:  edges,
	}, nil
}

func (r *PipelineReconciler) pipelineStageServiceAttributes(ctx context.Context, p v1alpha1.PipelineStageService) (*console.StageServiceAttributes, error) {
	service, err := utils.GetServiceDeployment(ctx, r.Client, p.ServiceRef)
	if err != nil {
		return nil, err
	}

	// TODO: Extracting cluster ref from the service, not from the user provided config. Is it okay?
	cluster, err := utils.GetCluster(ctx, r.Client, &service.Spec.ClusterRef)
	if err != nil {
		return nil, err
	}

	criteria, err := r.pipelineStageServiceCriteriaAttributes(ctx, p.Criteria)
	if err != nil {
		return nil, err
	}

	return &console.StageServiceAttributes{
		Handle:    cluster.Status.ID, // TODO: Using cluster ID instead of handle. Will it work?
		Name:      nil,               // Using ServiceID instead.
		ServiceID: service.Status.ID,
		Criteria:  criteria,
	}, nil
}

func (r *PipelineReconciler) pipelineStageServiceCriteriaAttributes(ctx context.Context, p *v1alpha1.PipelineStageServicePromotionCriteria) (*console.PromotionCriteriaAttributes, error) {
	service, err := utils.GetServiceDeployment(ctx, r.Client, p.ServiceRef)
	if err != nil {
		return nil, err
	}

	// TODO: Extracting cluster ref from the service, not from the user provided config. Is it okay?
	cluster, err := utils.GetCluster(ctx, r.Client, &service.Spec.ClusterRef)
	if err != nil {
		return nil, err
	}

	return &console.PromotionCriteriaAttributes{
		Handle:   cluster.Status.ID, // TODO: Using cluster ID instead of handle. Will it work?
		Name:     nil,               // Using SourceID instead.
		SourceID: service.Status.ID,
		Secrets:  p.Secrets,
	}, nil
}
