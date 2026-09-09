defmodule Console.AI.Tools.Workbench.Observability.External.Cloudwatch do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.External.Support
  alias Console.Schema.WorkbenchTool

  def list_dashboards(%WorkbenchTool{configuration: %{cloudwatch: %{} = config}}, opts) do
    operation =
      [
        dashboard_name_prefix: opts[:q],
        next_token: opts[:cursor]
      ]
      |> Enum.reject(fn {_, value} -> is_nil(value) end)
      |> ExAws.Cloudwatch.list_dashboards()

    with {:ok, %{body: %{dashboards: dashboards, next_token: next_cursor}}} <-
           ExAws.request(operation, aws_config(config)) do
      dashboards = Enum.map(dashboards, &normalize_dashboard/1)
      {:ok, Support.page(:dashboards, dashboards, opts, next_cursor: empty_to_nil(next_cursor))}
    end
  end

  def get_dashboard(
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
       Support.item(
         body.dashboard_name,
         body.dashboard_name,
         nil,
         body.dashboard_arn,
         definition
       )}
    end
  end

  def list_monitors(%WorkbenchTool{configuration: %{cloudwatch: %{} = config}}, opts) do
    operation =
      [
        alarm_name_prefix: opts[:q],
        next_token: opts[:cursor],
        max_records: opts[:limit]
      ]
      |> Enum.reject(fn {_, value} -> is_nil(value) end)
      |> ExAws.Cloudwatch.describe_alarms()

    with {:ok, %{body: %{alarms: alarms, next_token: next_cursor}}} <-
           ExAws.request(operation, aws_config(config)) do
      monitors = Enum.map(alarms, &normalize_monitor/1)
      {:ok, Support.page(:monitors, monitors, opts, next_cursor: empty_to_nil(next_cursor))}
    end
  end

  def get_monitor(
        %WorkbenchTool{configuration: %{cloudwatch: %{} = config}},
        monitor_id,
        _opts
      ) do
    operation = ExAws.Cloudwatch.describe_alarms(alarm_names: [monitor_id])

    with {:ok, %{body: %{alarms: [alarm | _]}}} <-
           ExAws.request(operation, aws_config(config)) do
      {:ok, normalize_monitor(alarm)}
    else
      {:ok, %{body: %{alarms: []}}} -> {:error, "cloudwatch alarm not found"}
      error -> error
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

  defp normalize_dashboard(dashboard) do
    Support.item(
      dashboard.dashboard_name,
      dashboard.dashboard_name,
      nil,
      dashboard.dashboard_arn,
      %{last_modified: dashboard.last_modified, size: dashboard.size}
    )
  end

  defp normalize_monitor(alarm) do
    Support.item(
      alarm.alarm_name,
      alarm.alarm_name,
      alarm.alarm_description,
      alarm.alarm_arn,
      alarm
    )
  end

  defp empty_to_nil(value) when value in [nil, ""], do: nil
  defp empty_to_nil(value), do: value
end
