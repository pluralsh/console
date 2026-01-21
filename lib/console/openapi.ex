defmodule Console.OpenAPI do
  alias Oaskit.Spec.Paths
  alias Oaskit.Spec.Server
  use Oaskit

  @impl true
  def spec do
    %{
      openapi: "3.1.1",
      info: %{
        title: "Plural REST API",
        version: "1.0.0",
        description: "Main HTTP API for Plural"
      },
      servers: [Server.from_config(:console, ConsoleWeb.Endpoint)],
      paths: Paths.from_router(ConsoleWeb.Router, filter: &String.starts_with?(&1.path, "/api/v1/"))
    }
  end
end
