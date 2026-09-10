defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Cloudwatch do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support
  alias Console.Schema.WorkbenchTool

  def list(%WorkbenchTool{configuration: %{cloudwatch: %{} = config}}, opts) do
    operation =
      [
        dashboard_name_prefix: opts[:q],
        next_token: opts[:cursor]
      ]
      |> Enum.reject(fn {_, value} -> is_nil(value) end)
      |> ExAws.Cloudwatch.list_dashboards()

    with {:ok, %{body: %{dashboards: dashboards, next_token: next_cursor}}} <-
           ExAws.request(operation, aws_config(config)) do
      dashboards = Enum.map(dashboards, &normalize/1)
      {:ok, Support.page(dashboards, opts, next_cursor: empty_to_nil(next_cursor))}
    end
  end

  def get(
        %WorkbenchTool{configuration: %{cloudwatch: %{} = config}},
        dashboard_id,
        _opts
      ) do
    operation = ExAws.Cloudwatch.get_dashboard(dashboard_name: dashboard_id)

    with {:ok, %{body: body}} <- ExAws.request(operation, aws_config(config)) do
      definition =
        body.dashboard_body
        |> Jason.decode()
        |> case do
          {:ok, definition} -> definition
          _ -> %{}
        end

      {:ok,
       Support.dashboard(
         body.dashboard_name,
         body.dashboard_name,
         nil,
         body.dashboard_arn,
         definition
       )}
    end
  end

  defp aws_config(config) do
    [
      region: config.region,
      access_key_id: config.access_key_id,
      secret_access_key: config.secret_access_key
    ]
    |> Enum.reject(fn {_, value} -> value in [nil, ""] end)
  end

  defp normalize(dashboard) do
    Support.dashboard(
      dashboard.dashboard_name,
      dashboard.dashboard_name,
      nil,
      dashboard.dashboard_arn,
      %{last_modified: dashboard.last_modified, size: dashboard.size}
    )
  end

  defp empty_to_nil(value) when value in [nil, ""], do: nil
  defp empty_to_nil(value), do: value
end
