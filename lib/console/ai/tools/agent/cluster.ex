defmodule Console.AI.Tools.Agent.Cluster do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.VectorStore
  alias Console.Schema.Cluster.Mini

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/cluster.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("cluster_search")
  def description(), do: "Execute a semantic search for a kubernetes cluster.  Use this if a user is searching specifically for a kubernetes cluster or for a resource that would likely be deployed to a kubernetes cluster, eg a stateless service or kubernetes operator"

  @opts [filters: [datatype: {:raw, :cluster}], count: 15]

  def implement(%__MODULE__{query: query}) do
    with true <- VectorStore.enabled?(),
         {:ok, results} <- VectorStore.fetch(query, @opts) do
      Enum.map(results, &format/1)
      |> Enum.filter(& &1)
      |> Jason.encode()
    else
      false -> {:ok, "Vector store is not enabled, cannot query"}
      {:error, reason} -> {:ok, "Error searching vector store: #{inspect(reason)}"}
    end
  end

  defp format(%VectorStore.Response{type: :cluster, cluster: %Mini{} = mini}),
    do: mini
  defp format(_), do: nil
end
