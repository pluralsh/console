package router

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/bytedance/sonic"
	"github.com/maximhq/bifrost/core/providers/openai"
	"github.com/maximhq/bifrost/core/schemas"
	"go.uber.org/zap"
)

// handleDecisions serves OpenAI's POST /v1/decisions. A request for the "auto" model is tried on each resolved
// decision target in turn; emulation is a per-request context flag in bifrost, so targets are attempted here rather
// than as bifrost fallbacks.
func (in *OpenAIRouter) handleDecisions(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := newRequestContext(r)
	defer cancel()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		in.sendError(w, ctx, in.errorConverter, in.toBifrostError(err, "Failed to read request body"))
		return
	}

	req := &openai.OpenAIDecisionRequest{}
	if err := sonic.Unmarshal(body, req); err != nil {
		in.sendError(w, ctx, in.errorConverter, in.toBifrostError(err, "Invalid JSON"))
		return
	}

	bifrostReq, err := req.ToBifrostDecisionRequest()
	if err != nil {
		in.sendError(w, ctx, in.errorConverter, badRequest(in.toBifrostError(err, "invalid decision request")))
		return
	}

	targets, err := in.resolveDecisionTargets(r.Context(), req.Model)
	if err != nil {
		in.sendError(w, ctx, in.errorConverter, badRequest(in.toBifrostError(err, "failed to resolve decision model")))
		return
	}

	var lastErr *schemas.BifrostError
	for _, target := range targets {
		resp, bifrostErr := in.attemptDecision(r, bifrostReq, target)
		if bifrostErr == nil && resp != nil {
			in.sendSuccess(w, ctx, in.errorConverter, openai.ToOpenAIDecisionResponse(resp))
			return
		}

		lastErr = bifrostErr
		in.logger.Warn("decision attempt failed",
			zap.String("provider", string(target.Provider)),
			zap.String("model", target.Model),
			zap.Bool("emulated", target.Emulate),
			zap.String("error", bifrostErrorMessage(bifrostErr)),
		)
	}

	if lastErr == nil {
		lastErr = in.toBifrostError(nil, "decision request failed")
	}
	in.sendError(w, ctx, in.errorConverter, lastErr)
}

func (in *OpenAIRouter) attemptDecision(r *http.Request, req *schemas.BifrostDecisionRequest, target decisionTarget) (*schemas.BifrostDecisionResponse, *schemas.BifrostError) {
	ctx, cancel := newRequestContext(r)
	defer cancel()
	if target.Emulate {
		ctx.SetValue(schemas.BifrostContextKeyChangeRequestType, schemas.ResponsesRequest)
	}

	attempt := *req
	attempt.Provider = target.Provider
	attempt.Model = target.Model
	attempt.Fallbacks = nil
	return in.client.DecisionRequest(ctx, &attempt)
}

func (in *OpenAIRouter) resolveDecisionTargets(ctx context.Context, model string) ([]decisionTarget, error) {
	model = strings.TrimSpace(model)
	if model == "" || model == AutoDecisionModel {
		aiConfig, err := in.consoleClient.GetAiConfig(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to load AI config: %w", err)
		}
		targets := decisionTargets(aiConfig)
		if len(targets) == 0 {
			return nil, errors.New("no decision model is configured")
		}
		return targets, nil
	}

	if !strings.Contains(model, "/") {
		model = string(schemas.OpenAI) + "/" + model
	}
	provider, name, _, err := in.resolveModel(ctx, model)
	if err != nil {
		return nil, err
	}
	return explicitDecisionTargets(provider, name), nil
}

func badRequest(err *schemas.BifrostError) *schemas.BifrostError {
	status := http.StatusBadRequest
	err.StatusCode = &status
	return err
}

func bifrostErrorMessage(err *schemas.BifrostError) string {
	if err == nil || err.Error == nil {
		return ""
	}
	return err.Error.Message
}
