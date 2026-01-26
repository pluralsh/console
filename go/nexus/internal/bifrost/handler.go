package bifrost

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	bifrostcore "github.com/maximhq/bifrost/core"
	"github.com/maximhq/bifrost/core/schemas"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/pluralsh/console/go/nexus/internal/log"
	"go.uber.org/zap"
)

// Handler manages AI requests using the Bifrost Core SDK
type Handler struct {
	consoleClient console.Client
	bifrostClient *bifrostcore.Bifrost
	logger        *zap.Logger
	router        chi.Router
}

// NewHandler creates a new Bifrost handler using the Bifrost Core SDK
func NewHandler(consoleClient console.Client) (*Handler, error) {
	logger := log.Logger().With(zap.String("component", "bifrost-handler"))
	account := NewAccount(context.Background(), consoleClient, logger)
	bifrostClient, err := bifrostcore.Init(context.Background(), schemas.BifrostConfig{
		Account:            account,
		InitialPoolSize:    1000,
		DropExcessRequests: false,
		Logger:             bifrostcore.NewDefaultLogger(schemas.LogLevelInfo),
		Plugins:            []schemas.Plugin{},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Bifrost client: %w", err)
	}

	h := &Handler{
		consoleClient: consoleClient,
		bifrostClient: bifrostClient,
		logger:        logger,
		router:        chi.NewRouter(),
	}

	h.registerRoutes()

	return h, nil
}

func (h *Handler) registerRoutes() {
	NewOpenAIRouter(h.bifrostClient).RegisterRoutes(h.router)
	NewAnthropicRouter(h.bifrostClient).RegisterRoutes(h.router)
}

// ServeHTTP implements the http.Handler interface
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.router.ServeHTTP(w, r)
}

// Shutdown gracefully shuts down the Bifrost client
func (h *Handler) Shutdown() {
	if h.bifrostClient != nil {
		h.logger.Info("shutting down Bifrost client")
		h.bifrostClient.Shutdown()
	}
}
