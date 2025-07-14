defmodule Console.AI.Tools.Agent.ServiceComponent do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.VectorStore
  alias Console.Schema.ServiceComponent.Mini

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/service_component.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("service_search")
  def description(), do: "Execute a semantic search for a kubernetes resource deployed through a Plural Service.  Use this if a user is searching specifically for a plural service or for a resource that would likely be deployed to a kubernetes cluster, eg a stateless service or kubernetes operator"

  @opts [filters: [datatype: {:raw, :service_component}], count: 3]

  def implement(%__MODULE__{query: query}) do
    with true <- VectorStore.enabled?(),
         {:ok, results} <- VectorStore.fetch(query, @opts) do
      Enum.map(results, &format/1)
      |> Enum.filter(& &1)
      |> Enum.map(&Map.from_struct/1)
      |> Jason.encode()
    else
      false -> {:ok, "Vector store is not enabled, cannot query"}
      {:error, reason} -> {:ok, "Error searching vector store: #{inspect(reason)}"}
    end
  end

  defp format(%VectorStore.Response{type: :service, service_component: %Mini{} = mini}),
    do: mini
  defp format(_), do: nil
end
