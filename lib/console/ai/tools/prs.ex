defmodule Console.AI.Tools.Prs do
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

  @json_schema Console.priv_file!("tools/prs.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("pull_requests")
  def description(), do: "Shows a list of files from pull requests (or the comparable concepts for other SCM systems) that semantically math the given query"

  def implement(%__MODULE__{query: query}) do
    with {:flow, %Flow{id: flow_id}} <- {:flow, Tool.flow()},
         true <- VectorStore.enabled?(),
         opts = [filters: [flow_id: flow_id, datatype: {:raw, :pr_file}]],
         {:ok, result} <- VectorStore.fetch(query, opts) do
      model(result)
      |> Jason.encode()
    else
      {:flow, _} -> {:error, "no flow found"}
      false -> {:ok, "no vector store configured, so cannot fetch historical PR data"}
      err -> {:error, "internal error fetching pr data: #{inspect(err)}"}
    end
  end

  defp model(files) do
    Enum.map(files, fn %VectorStore.Response{type: :pr, pr_file: pr_file} ->
      Map.from_struct(pr_file)
    end)
  end
end
