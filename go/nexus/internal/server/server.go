package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"go.uber.org/zap"

	"github.com/pluralsh/console/go/nexus/internal/bifrost"
	"github.com/pluralsh/console/go/nexus/internal/config"
	"github.com/pluralsh/console/go/nexus/internal/console"
	"github.com/pluralsh/console/go/nexus/internal/log"
	nexusmw "github.com/pluralsh/console/go/nexus/internal/middleware"
)

// Server represents the HTTP server with graceful shutdown support
type Server struct {
	config         *config.ServerConfig
	logger         *zap.Logger
	httpServer     *http.Server
	router         chi.Router
	consoleClient  console.Client
	bifrostHandler *bifrost.Handler
}

// New creates a new HTTP server instance with Chi router
func New(cfg *config.ServerConfig, consoleClient console.Client) *Server {
	return &Server{
		config:        cfg,
		logger:        log.Logger(),
		consoleClient: consoleClient,
		router:        chi.NewRouter(),
	}
}

// SetupRoutes configures all routes and middleware
func (s *Server) SetupRoutes() {
	r := s.router

	r.Use(middleware.StripPrefix(s.config.Path))
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(nexusmw.RequestLogger())
	r.Use(nexusmw.Recovery())

	// Health endpoints (no auth required) - with short timeout
	r.Group(func(r chi.Router) {
		r.Use(middleware.Timeout(30 * time.Second)) // Short timeout for health checks
		r.Get("/health", HealthHandler())
		r.Get("/ready", ReadyHandler(s.consoleClient))
	})

	// AI Proxy routes (Bifrost) - Protected with authentication
	s.logger.Info("mounting authenticated Bifrost handler on /")
	r.Group(func(r chi.Router) {
		// 30 minute timeout for long-running streaming AI responses
		r.Use(middleware.Timeout(30 * time.Minute))
		r.Use(nexusmw.Auth(s.consoleClient))
		r.Mount("/", s.bifrostHandler)
	})
}

// Start initializes and starts the HTTP server
// Returns a ready channel that will be closed when the server is listening and ready to accept connections
func (s *Server) Start(ctx context.Context) (<-chan struct{}, error) {
	bifrostHandler, err := bifrost.NewHandler(s.consoleClient)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Bifrost handler: %w", err)
	}
	s.bifrostHandler = bifrostHandler

	// Setup routes
	s.SetupRoutes()

	addr := s.config.Address
	if addr == "" {
		addr = ":8080" // Default
	}

	// Use configured timeouts or defaults
	readTimeout := s.config.ReadTimeout
	if readTimeout == 0 {
		readTimeout = 15 * time.Second
	}

	// WriteTimeout is set to 0 (no timeout) to support long-running streaming responses
	// The middleware.Timeout in route handlers will handle request-level timeouts instead
	writeTimeout := time.Duration(0) // No timeout for streaming

	idleTimeout := s.config.IdleTimeout
	if idleTimeout == 0 {
		idleTimeout = 120 * time.Second
	}

	s.httpServer = &http.Server{
		Addr:              addr,
		Handler:           s.router,
		ReadTimeout:       readTimeout,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      writeTimeout, // 0 = no timeout, allows infinite streaming
		IdleTimeout:       idleTimeout,
		MaxHeaderBytes:    1 << 20, // 1 MB
	}

	s.logger.Info("starting HTTP server",
		zap.String("address", addr),
	)

	ready := make(chan struct{})
	errChan := make(chan error, 1)

	go func() {
		err = s.httpServer.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			errChan <- fmt.Errorf("server error: %w", err)
		}
	}()

	// Signal that server is ready (listening on port)
	// Note: There's a small race condition here - the server might not be fully ready
	// to accept connections yet, but this is the best we can do without modifying http.Server
	close(ready)

	go func() {
		// Wait for context cancellation or server error
		select {
		case <-ctx.Done():
			if err := s.Shutdown(context.Background()); err != nil {
				errChan <- err
			}
		case err := <-errChan:
			s.logger.Error("HTTP server encountered an error", zap.Error(err))
		}
	}()

	return ready, nil
}

// Shutdown gracefully shuts down the HTTP server
func (s *Server) Shutdown(ctx context.Context) error {
	if s.httpServer == nil {
		return nil
	}

	s.logger.Info("shutting down HTTP server")

	// Create shutdown context with timeout
	shutdownTimeout := 30 * time.Second
	if deadline, ok := ctx.Deadline(); ok {
		shutdownTimeout = time.Until(deadline)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := s.httpServer.Shutdown(shutdownCtx); err != nil {
		s.logger.Error("error during server shutdown", zap.Error(err))
		return fmt.Errorf("server shutdown error: %w", err)
	}

	s.bifrostHandler.Shutdown()

	s.logger.Info("HTTP server shutdown complete")
	return nil
}

// Addr returns the server's listening address
func (s *Server) Addr() string {
	if s.httpServer != nil {
		return s.httpServer.Addr
	}
	return ""
}

// Router returns the underlying Chi router for testing
func (s *Server) Router() chi.Router {
	return s.router
}
