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
	"github.com/pluralsh/polly/algorithms"
	v1 "k8s.io/api/core/v1"
)

func (r *PipelineReconciler) pipelineAttributes(ctx context.Context, p *v1alpha1.Pipeline) (*console.PipelineAttributes, error) {
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

	return &console.PipelineAttributes{
		Stages: stages,
		Edges:  edges,
	}, nil
}

func (r *PipelineReconciler) pipelineStageServiceAttributes(ctx context.Context, stageService v1alpha1.PipelineStageService) (*console.StageServiceAttributes, error) {
	service, err := utils.GetServiceDeployment(ctx, r.Client, stageService.ServiceRef)
	if err != nil {
		return nil, err
	}

	// TODO: Extracting cluster ref from the service, not from the custom resource field. Is it okay?
	cluster, err := utils.GetCluster(ctx, r.Client, &service.Spec.ClusterRef)
	if err != nil {
		return nil, err
	}

	criteria, err := r.pipelineStageServiceCriteriaAttributes(ctx, stageService.Criteria)
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

func (r *PipelineReconciler) pipelineStageServiceCriteriaAttributes(ctx context.Context, criteria *v1alpha1.PipelineStageServicePromotionCriteria) (*console.PromotionCriteriaAttributes, error) {
	if criteria == nil {
		return nil, nil
	}

	service, err := utils.GetServiceDeployment(ctx, r.Client, criteria.ServiceRef)
	if err != nil {
		return nil, err
	}

	// TODO: Extracting cluster ref from the service, not from the custom resource field. Is it okay?
	cluster, err := utils.GetCluster(ctx, r.Client, &service.Spec.ClusterRef)
	if err != nil {
		return nil, err
	}

	return &console.PromotionCriteriaAttributes{
		Handle:   cluster.Status.ID, // TODO: Using cluster ID instead of handle. Will it work?
		Name:     nil,               // Using SourceID instead.
		SourceID: service.Status.ID,
		Secrets:  criteria.Secrets,
	}, nil
}

func (r *PipelineReconciler) pipelineEdgeGateAttributes(ctx context.Context, gate v1alpha1.PipelineGate) (*console.PipelineGateAttributes, error) {
	clusterRef, err := r.pipelineEdgeGateClusterIDAttribute(ctx, gate.ClusterRef)
	if err != nil {
		return nil, err
	}

	return &console.PipelineGateAttributes{
		Name:      gate.Name,
		Type:      gate.Type,
		Cluster:   nil, // Using ClusterID instead.
		ClusterID: clusterRef,
		Spec:      r.pipelineEdgeGateSpecAttributes(gate.Spec),
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

func (r *PipelineReconciler) pipelineEdgeGateSpecAttributes(spec *v1alpha1.GateSpec) *console.GateSpecAttributes {
	if spec == nil {
		return nil
	}

	return &console.GateSpecAttributes{
		Job: r.pipelineEdgeGateSpecJobAttributes(spec.Job),
	}
}

func (r *PipelineReconciler) pipelineEdgeGateSpecJobAttributes(job *v1alpha1.GateJob) *console.GateJobAttributes {
	if job == nil {
		return nil
	}

	return &console.GateJobAttributes{
		Namespace: job.Namespace,
		Raw:       job.Raw,
		Containers: algorithms.Map(job.Containers,
			func(c *v1alpha1.Container) *console.ContainerAttributes {
				return &console.ContainerAttributes{
					Image: c.Image,
					Args:  c.Args,
					Env: algorithms.Map(c.Env, func(e *v1alpha1.Env) *console.EnvAttributes {
						return &console.EnvAttributes{
							Name:  e.Name,
							Value: e.Value,
						}
					}),
					EnvFrom: algorithms.Map(c.EnvFrom, func(e *v1alpha1.EnvFrom) *console.EnvFromAttributes {
						return &console.EnvFromAttributes{
							Secret:    e.Secret,
							ConfigMap: e.ConfigMap,
						}
					}),
				}
			}),
		Labels:         utils.ToMapStringAny(job.Labels),
		Annotations:    utils.ToMapStringAny(job.Annotations),
		ServiceAccount: job.ServiceAccount,
	}
}
