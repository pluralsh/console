defmodule ConsoleWeb.Router do
  use ConsoleWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :auth do
    plug ConsoleWeb.GuardianPipeline
    plug ConsoleWeb.Plugs.AbsintheContext
    plug ConsoleWeb.Plugs.Authorized
  end

  get "/health", ConsoleWeb.HealthController, :health

  scope "/v1", ConsoleWeb do
    pipe_through [:api]

    post "/token/exchange", JWTController, :exchange
    get "/dashboard/cluster", WebhookController, :cluster
  end

  scope "/mcp", ConsoleWeb do
    get "/.well-known/jwks.json", JWKController, :mcp
  end

  scope "/ext" do
    ## unauthenticated routes
    scope "/" do
      pipe_through [:api]

      scope "/v1", ConsoleWeb do
        scope "/ai" do
          scope "/openai" do
            post "/v1/chat/completions", AIController, :openai_chat_completions
            post "/v1/embeddings", AIController, :openai_embeddings
          end
        end

        get "/agent/chart", GitController, :agent_chart
        post "/webhooks/observability/:type/:id", WebhookController, :observability
        post "/webhooks/:type/:id", WebhookController, :scm

        scope "/states" do
          scope "/terraform" do
            get "/:stack_id",         StackController, :get_tf_state
            post "/:stack_id/lock",   StackController, :lock_tf_state
            post "/:stack_id/unlock", StackController, :unlock_tf_state
            post "/:stack_id",        StackController, :update_tf_state
          end
        end
      end
    end

    ## authenticated routes
    scope "/" do
      pipe_through [:auth]

      forward "/gql", Console.ExternalGraphQl.Plug,
        schema: Console.ExternalGraphQl,
        document_providers: [Console.GraphQl.Apq, Absinthe.Plug.DocumentProvider.Default],
        analyze_complexity: true,
        max_complexity: 650,
        token_limit: 5_000

      scope "/v1", ConsoleWeb do
        get "/digests", GitController, :digest
        get "/git/tarballs", GitController, :tarball
        get "/git/stacks/tarballs", GitController, :stack_tarball

        post "/webhooks/:type/:id", WebhookController, :scm

        get "/gate/:cluster/:name", GitController, :proceed
        get "/gate/:id", GitController, :proceed
        post "/gate/:cluster/:name", GitController, :proceed
        post "/gate/:id", GitController, :proceed

        get "/rollback/:cluster/:name", GitController, :rollback
        get "/rollback/:id", GitController, :rollback
        post "/rollback/:cluster/:name", GitController, :rollback
        post "/rollback/:id", GitController, :rollback
      end
    end
  end

  scope "/" do
    pipe_through [:auth]

    scope "/v1", ConsoleWeb do
      get "/digests", GitController, :digest
      get "/compliance/report", ComplianceController, :report
      get "/compliance/report/:name", ComplianceController, :report
      get "/git/tarballs", GitController, :tarball
      get "/git/stacks/tarballs", GitController, :stack_tarball
    end

    forward "/gql", Absinthe.Plug,
      schema: Console.GraphQl,
      document_providers: [Console.GraphQl.Apq, Absinthe.Plug.DocumentProvider.Default],
      analyze_complexity: true,
      max_complexity: 650,
      token_limit: 5_000
  end

  scope "/", ConsoleWeb do
    get "/", PageController, :index
    get "/*path", PageController, :index
  end
end
