defmodule Console.AI.Tools.AlertsResolutions do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.{Tool, VectorStore}
  alias Console.Schema.Flow

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/alerts_resolutions.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("alerts_resolutions")
  def description(), do: "Shows alert resolutions for the current flow. Uses semantic search to find resolutions."

  def implement(%__MODULE__{query: query}) do
    with {:flow, %Flow{id: flow_id}} <- {:flow, Tool.flow()},
         true <- VectorStore.enabled?(),
         fetch_opts = [filters: [flow_id: flow_id, datatype: {:raw, :alert_resolution}]],
         {:ok, result} <- VectorStore.fetch(query, fetch_opts) do
      model(result)
      |> Jason.encode()
    else
      {:flow, _} -> {:error, "no flow found"}
      false -> {:ok, "no vector store configured, so cannot fetch historical alert resolutions"}
      err -> {:error, "internal error fetching alert resolutions: #{inspect(err)}"}
    end
  end

  defp model(resolutions) do
    Enum.map(resolutions, fn %VectorStore.Response{type: :alert, alert_resolution: resolution} ->
      Map.from_struct(resolution)
    end)
  end
end
