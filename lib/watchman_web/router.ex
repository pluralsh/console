defmodule WatchmanWeb.Router do
  use WatchmanWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :auth do
    plug WatchmanWeb.GuardianPipeline
    plug WatchmanWeb.Plugs.AbsintheContext
    plug WatchmanWeb.Plugs.Authorized
  end

  get "/health", WatchmanWeb.HealthController, :health

  scope "/v1", WatchmanWeb do
    pipe_through [:api]

    post "/webhook", WebhookController, :webhook
    post "/webhooks/piazza", WebhookController, :piazza
  end

  forward "/graphiql", Absinthe.Plug.GraphiQL,
    schema: Watchman.GraphQl,
    interface: :advanced

  scope "/" do
    pipe_through [:auth]

    scope "/v1", WatchmanWeb do
      get "/logs/:repo/download", LogController, :download
    end

    forward "/gql", Absinthe.Plug,
      schema: Watchman.GraphQl,
      document_providers: [Watchman.GraphQl.Apq, Absinthe.Plug.DocumentProvider.Default]
  end

  scope "/", WatchmanWeb do
    get "/", PageController, :index
    get "/*path", PageController, :index
  end
end
