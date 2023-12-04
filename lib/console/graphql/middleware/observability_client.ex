defmodule Console.Middleware.ObservabilityClient do
  @behaviour Absinthe.Middleware
  alias Console.Schema.{DeploymentSettings}
  alias Console.Deployments.Settings
  alias Console.Services.Observability

  def call(%{arguments: %{cluster_id: _}} = res, scope) do
    with %DeploymentSettings{} = settings <- Settings.fetch(),
         %DeploymentSettings.Connection{} = conn <- find(settings, scope),
         _ <- Observability.put_connection(scope, conn) do
      res
    else
      _ -> res
    end
  end
  def call(res, _), do: res

  defp find(%DeploymentSettings{loki_connection: loki}, :loki), do: loki
  defp find(%DeploymentSettings{prometheus_connection: prometheus}, :prometheus), do: prometheus
  defp find(_, _), do: nil
end
