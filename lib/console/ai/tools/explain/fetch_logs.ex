defmodule Console.AI.Tools.Explain.FetchLogs do
  use Console.AI.Tools.Agent.Base
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Logs.{Provider, Time, Query}
  alias Console.Schema.Service

  embedded_schema do
    field :query,  :string
    field :pod,    :string
    field :before, :utc_datetime_usec
    field :after,  :utc_datetime_usec
    field :limit,  :integer
  end

  @valid ~w(query pod before after limit)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/explain/logs.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("fetch_logs")
  def description() do
    """
    Lists the logs for a piece of infrastructure within Plural. You can specify a query to filter the logs, and a time range to search within.  The search
    query can be empty if you just want to list recent logs or logs before a specific time.
    """
  end

  def implement(%__MODULE__{query: query} = logs) do
    with {:svc, %Service{} = svc} <- {:svc, Tool.parent()},
         %Service{} <- Repo.preload(svc, [:cluster]),
         query <- Query.new(query: query || "", resource: svc, pod: logs.pod, limit: logs.limit || 10),
         {:ok, logs} <- Provider.query(add_time(query, logs)) do
      logs
      |> Enum.map(&Map.put(&1, :timestamp, Timex.format!(&1.timestamp, "{ISO:Extended}")))
      |> Console.mapify()
      |> Jason.encode()
    else
      {:svc, _} -> {:error, "no service found"}
      err -> {:error, "error fetching logs: #{inspect(err)}"}
    end
  end

  defp add_time(query, %__MODULE__{before: before}) when not is_nil(before), do: %{query | time: %Time{before: before}}
  defp add_time(query, %__MODULE__{after: aft}) when not is_nil(aft), do: %{query | time: %Time{after: aft}}
  defp add_time(query, %__MODULE__{before: before, after: aft}) when not is_nil(before) and not is_nil(aft),
    do: %{query | time: %Time{before: before, after: aft}}
  defp add_time(query, _), do: query
end
