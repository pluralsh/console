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
  post "/alertmanager", ConsoleWeb.WebhookController, :alertmanager

  scope "/v1", ConsoleWeb do
    pipe_through [:api]

    post "/webhook", WebhookController, :webhook
    post "/webhooks/piazza", WebhookController, :piazza
  end

  scope "/ext" do
    ## unauthenticated routes
    scope "/" do
      pipe_through [:api]

      scope "/v1", ConsoleWeb do
        post "/webhooks/:type/:id", WebhookController, :scm

        scope "/states" do
          scope "/terraform" do
            get "/:stack_id", StackController, :get_tf_state
            post "/:stack_id", StackController, :update_tf_state
            post "/:stack_id/lock", StackController, :lock_tf_state
            post "/:stack_id/unlock", StackController, :unlock_tf_state
          end
        end
      end
    end

    ## authenticated routes
    scope "/" do
      pipe_through [:auth]

      forward "/gql", Console.ExternalGraphQl.Plug,
        schema: Console.ExternalGraphQl,
        document_providers: [Console.GraphQl.Apq, Absinthe.Plug.DocumentProvider.Default]

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

  forward "/graphiql", Absinthe.Plug.GraphiQL,
    schema: Console.GraphQl,
    interface: :playground,
    default_url: {Console, :graphql_endpoint},
    socket_url: {Console, :socket_endpoint}

  scope "/" do
    pipe_through [:auth]

    scope "/v1", ConsoleWeb do
      get "/logs/:repo/download", LogController, :download
      get "/digests", GitController, :digest
      get "/git/tarballs", GitController, :tarball
      get "/git/stacks/tarballs", GitController, :stack_tarball
    end

    forward "/gql", Absinthe.Plug,
      schema: Console.GraphQl,
      document_providers: [Console.GraphQl.Apq, Absinthe.Plug.DocumentProvider.Default]
  end

  scope "/", ConsoleWeb do
    get "/", PageController, :index
    get "/*path", PageController, :index
  end
end
