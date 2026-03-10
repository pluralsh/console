package router

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/providers/gemini"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

const (
	routeGeminiV1GenerateContent       = "/gemini/v1/models/{model}:generateContent"
	routeGeminiV1StreamGenerateContent = "/gemini/v1/models/{model}:streamGenerateContent"
	routeGeminiV1CountTokens           = "/gemini/v1/models/{model}:countTokens"

	routeGeminiV1BetaGenerateContent       = "/gemini/v1beta/models/{model}:generateContent"
	routeGeminiV1BetaStreamGenerateContent = "/gemini/v1beta/models/{model}:streamGenerateContent"
	routeGeminiV1BetaCountTokens           = "/gemini/v1beta/models/{model}:countTokens"
)

type geminiContextKey string

const (
	geminiPathModelContextKey   geminiContextKey = "gemini-path-model"
	geminiStreamStateContextKey geminiContextKey = "gemini-stream-state"
)

type GeminiRouter struct {
	*GenericRouter
}

func (in *GeminiRouter) init() Router {
	in.logger = log.Logger().With(zap.String("component", "bifrost-gemini-router"))
	in.routes = []RouteConfig{
		in.newGenerateContentRoute(routeGeminiV1GenerateContent),
		in.newGenerateContentRoute(routeGeminiV1BetaGenerateContent),
		in.newStreamGenerateContentRoute(routeGeminiV1StreamGenerateContent),
		in.newStreamGenerateContentRoute(routeGeminiV1BetaStreamGenerateContent),
		in.newCountTokensRoute(routeGeminiV1CountTokens),
		in.newCountTokensRoute(routeGeminiV1BetaCountTokens),
	}

	return in
}

func NewGeminiRouter(client *bifrostcore.Bifrost, resolver *EmbeddingsResolver) Router {
	return (&GeminiRouter{
		GenericRouter: &GenericRouter{
			client:   client,
			resolver: resolver,
		},
	}).init()
}

func (in *GeminiRouter) geminiErrorConverter(_ *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
	return gemini.ToGeminiError(err)
}

func (in *GeminiRouter) geminiModelPreCallback(forceStream bool) PreRequestCallback {
	return func(request *http.Request, bifrostCtx *schemas.BifrostContext, req interface{}) error {
		pathModel := chi.URLParam(request, "model")
		if pathModel != "" {
			bifrostCtx.SetValue(geminiPathModelContextKey, pathModel)
		}

		if !forceStream {
			return nil
		}

		geminiReq, ok := req.(*gemini.GeminiGenerationRequest)
		if !ok {
			return errors.New("invalid request type")
		}

		geminiReq.Stream = true
		bifrostCtx.SetValue(geminiStreamStateContextKey, gemini.NewBifrostToGeminiStreamState())

		return nil
	}
}
