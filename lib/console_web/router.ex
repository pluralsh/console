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
    pipe_through [:auth]

    forward "/gql", Console.ExternalGraphQl.Plug,
      schema: Console.ExternalGraphQl,
      document_providers: [Console.GraphQl.Apq, Absinthe.Plug.DocumentProvider.Default]

    scope "/v1", ConsoleWeb do
      get "/git/tarballs", GitController, :tarball
    end
  end

  forward "/graphiql", Absinthe.Plug.GraphiQL,
    schema: Console.GraphQl,
    interface: :advanced

  scope "/" do
    pipe_through [:auth]

    scope "/v1", ConsoleWeb do
      get "/logs/:repo/download", LogController, :download
      get "/git/tarballs", GitController, :tarball
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
