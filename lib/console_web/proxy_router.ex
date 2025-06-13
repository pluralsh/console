defmodule ConsoleWeb.ProxyRouter do
  use ConsoleWeb, :router
  alias ConsoleWeb.Plugs.{Ingest, PromProxy}

  pipeline :ingest do
    plug Ingest
  end

  pipeline :query do
    plug Ingest
    plug Hammer.Plug, [
      rate_limit: {"global", :timer.seconds(1), 10},
      by: :ip
    ]
  end

  scope "/ext" do
    scope "/v1" do
      scope "/ingest", ConsoleWeb do
        pipe_through [:ingest]

        post "/prometheus", IngestController, :prometheus
        scope "/elastic" do
          get  "/_license", IngestController, :es_license
          post "/_bulk",    IngestController, :es_bulk
          get  "/",         IngestController, :es_root
        end
      end

      scope "/query" do
        pipe_through [:query]
        forward "/prometheus", PromProxy
      end
    end
  end

  match :*, "/*path", ConsoleWeb.Plugs.NoOp, []
end
