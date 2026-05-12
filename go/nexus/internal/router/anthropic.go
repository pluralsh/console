package router

import (
	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/providers/anthropic"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

const (
	routeAnthropicMessages    = "/anthropic/v1/messages"
	routeAnthropicCountTokens = "/anthropic/v1/messages/count_tokens"
)

type AnthropicRouter struct {
	*GenericRouter
}

func (in *AnthropicRouter) init() Router {
	in.logger = log.Logger().With(zap.String("component", "bifrost-anthropic-router"))
	in.routes = []RouteConfig{
		in.newMessagesRoute(),
		in.newCountTokensRoute(),
	}

	return in
}

func NewAnthropicRouter(client *bifrostcore.Bifrost, resolver *EmbeddingsResolver) Router {
	return (&AnthropicRouter{
		GenericRouter: &GenericRouter{
			client:   client,
			resolver: resolver,
		},
	}).init()
}

func (in *AnthropicRouter) anthropicErrorConverter(_ *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
	return anthropic.ToAnthropicChatCompletionError(err)
}

func (in *AnthropicRouter) anthropicStreamErrorConverter(_ *schemas.BifrostContext, err *schemas.BifrostError) interface{} {
	return anthropic.ToAnthropicResponsesStreamError(err)
}
