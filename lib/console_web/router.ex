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

  pipeline :openapi do
    plug :accepts, ["json"]
    plug ConsoleWeb.Plugs.EnsureAuthenticated
    plug Oaskit.Plugs.SpecProvider, spec: Console.OpenAPI
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
        document_providers: [Console.GraphQl.PersistedQuery, Absinthe.Plug.DocumentProvider.Default],
        analyze_complexity: true,
        max_complexity: 650,
        token_limit: 5_000

      scope "/v1", ConsoleWeb do
        get "/digests", GitController, :digest
        get "/git/tarballs", GitController, :tarball
        get "/git/stacks/tarballs", GitController, :stack_tarball
        get "/git/sentinels/tarballs", GitController, :sentinel_tarball

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
      get "/git/sentinels/tarballs", GitController, :sentinel_tarball
    end

    scope "/v1", ConsoleWeb do
      pipe_through [:openapi]

      scope "/api", OpenAPI do
        get "/me", UserController, :me
        get "/serviceaccounts", ServiceAccountController, :index
        get "/serviceaccounts/email/:email", ServiceAccountController, :show_by_email
        get "/serviceaccounts/:id", ServiceAccountController, :show
        post "/serviceaccounts/:id/token", ServiceAccountController, :token

        scope "/cd", CD do
          post "/clusters",       ClusterController, :create
          get "/clusters",        ClusterController, :index
          get "/clusters/:id",    ClusterController, :show
          put "/clusters/:id",    ClusterController, :update
          delete "/clusters/:id", ClusterController, :delete
          post "/clusters/:id/upgrade", ClusterUpgradeController, :create
          get "/clusterupgrade/:id",    ClusterUpgradeController, :show

          post "/git/repositories",       GitRepositoryController, :create
          get "/git/repositories",        GitRepositoryController, :index
          get "/git/repositories/url",    GitRepositoryController, :show_by_url
          get "/git/repositories/:id",    GitRepositoryController, :show
          put "/git/repositories/:id",    GitRepositoryController, :update
          delete "/git/repositories/:id", GitRepositoryController, :delete

          get "/helm/repositories",     HelmRepositoryController, :index
          get "/helm/repositories/url", HelmRepositoryController, :show_by_url
          get "/helm/repositories/:id", HelmRepositoryController, :show
          post "/helm/repositories",    HelmRepositoryController, :upsert

          post "/services",          ServiceController, :create
          get "/services",           ServiceController, :index
          get "/services/:id",       ServiceController, :show
          put "/services/:id",       ServiceController, :update
          delete "/services/:id",    ServiceController, :delete

          post "/globalservices",          GlobalServiceController, :create
          get "/globalservices",           GlobalServiceController, :index
          get "/globalservices/:id",       GlobalServiceController, :show
          put "/globalservices/:id",       GlobalServiceController, :update
          delete "/globalservices/:id",    GlobalServiceController, :delete
          post "/globalservices/:id/sync", GlobalServiceController, :sync

          get "/pipelines",             PipelineController, :index
          get "/pipelines/:id",         PipelineController, :show
          post "/pipelines/:id/trigger", PipelineController, :trigger
        end

        scope "/scm", SCM do
          post "/connections",       ConnectionController, :create
          get "/connections",        ConnectionController, :index
          get "/connections/:id",    ConnectionController, :show
          put "/connections/:id",    ConnectionController, :update
          delete "/connections/:id", ConnectionController, :delete

          get "/pullrequests",     PullRequestController, :index
          get "/pullrequests/:id", PullRequestController, :show

          post "/catalogs",       CatalogController, :create
          get "/catalogs",        CatalogController, :index
          get "/catalogs/:id",    CatalogController, :show
          put "/catalogs/:id",    CatalogController, :update
          delete "/catalogs/:id", CatalogController, :delete

          get "/catalogs/:catalog_id/prautomations",  PrAutomationController, :index_for_catalog
          get "/prautomations",                       PrAutomationController, :index
          get "/prautomations/:id",                   PrAutomationController, :show
          post "/prautomations/:id/invoke",           PrAutomationController, :invoke
        end

        post "/stacks", StackController, :create
        get "/stacks", StackController, :index
        get "/stacks/:id", StackController, :show
        put "/stacks/:id", StackController, :update
        delete "/stacks/:id", StackController, :delete
        post "/stacks/:id/trigger", StackController, :trigger_run
        post "/stacks/:id/resync", StackController, :resync
        put "/stacks/:id/restore", StackController, :restore

        get "/projects", ProjectController, :index
        get "/projects/:id", ProjectController, :show

        scope "/ai", AI do
          get "/runtimes",     AgentRuntimeController, :index
          get "/runtimes/:id", AgentRuntimeController, :show

          post "/runs",       AgentRunController, :create
          get "/runs",        AgentRunController, :index
          get "/runs/:id",    AgentRunController, :show

          post "/sessions",    AgentSessionController, :create
          get "/sessions",     AgentSessionController, :index
          get "/sessions/:id", AgentSessionController, :show

          get "/sentinels",                   SentinelController, :index
          get "/sentinels/:id",               SentinelController, :show
          post "/sentinels/:id/trigger",      SentinelController, :trigger
          get "/sentinels/:sentinel_id/runs", SentinelRunController, :index
          get "/sentinelruns/:id",            SentinelRunController, :show
        end
      end
    end

    forward "/gql", Absinthe.Plug,
      schema: Console.GraphQl,
      document_providers: [Console.GraphQl.PersistedQuery, Absinthe.Plug.DocumentProvider.Default],
      analyze_complexity: true,
      max_complexity: 650,
      token_limit: 5_000
  end

  scope "/", ConsoleWeb do
    get "/", PageController, :index
    get "/*path", PageController, :index
  end
end
