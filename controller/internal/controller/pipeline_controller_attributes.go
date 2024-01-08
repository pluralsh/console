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
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/polly/algorithms"
)

func (r *PipelineReconciler) pipelineAttributes(p *v1alpha1.Pipeline) console.PipelineAttributes {
	stages := make([]*console.PipelineStageAttributes, 0)
	for _, stage := range p.Spec.Stages {
		stages = append(stages, &console.PipelineStageAttributes{
			Name: stage.Name,
			Services: algorithms.Map(stage.Services,
				func(s v1alpha1.PipelineStageService) *console.StageServiceAttributes {
					return r.pipelineStageServiceAttributes(s)
				}),
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

	return console.PipelineAttributes{
		Stages: stages,
		Edges:  edges,
	}
}

func (r *PipelineReconciler) pipelineStageServiceAttributes(p v1alpha1.PipelineStageService) *console.StageServiceAttributes {

	return &console.StageServiceAttributes{
		Handle:    nil,
		Name:      nil,
		ServiceID: nil,
		Criteria: &console.PromotionCriteriaAttributes{
			Handle:   nil,
			Name:     nil,
			SourceID: nil,
			Secrets:  p.Criteria.Secrets,
		},
	}
}
