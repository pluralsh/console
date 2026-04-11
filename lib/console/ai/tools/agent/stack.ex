defmodule Console.AI.Tools.Agent.Stack do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.VectorStore
  alias Console.Schema.StackState.Mini

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/stack.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("stack_resource_search")
  def description(), do: "Execute a semantic search for a cloud resource within a Plural Stack.  Use this if a user is searching specifically for a plural stack or for what the state of any resource in the terraform configuration of their cloud currently shows."

  @opts [count: 15, filters: [datatype: {:raw, :stack_state}]]

  def implement(%__MODULE__{query: query}) do
    with true <- VectorStore.enabled?(),
         {:ok, results} <- VectorStore.fetch(query, [{:user, Tool.actor()} | @opts]) do
      Enum.map(results, &format/1)
      |> Enum.filter(& &1)
      |> Jason.encode()
    else
      false -> {:ok, "Vector store is not enabled, cannot query"}
      {:error, reason} -> {:ok, "Error searching vector store: #{inspect(reason)}"}
    end
  end

  defp format(%VectorStore.Response{type: :stack, stack_state: %Mini{stack: stack} = mini}) do
    Map.take(mini, [:identifier, :resource, :name, :configuration, :links])
    |> Map.merge(stack_attrs(stack))
  end
  defp format(_), do: nil

  defp stack_attrs(%{"id" => id, "name" => name, "repository" => %{"url" => url}, "git" => %{"ref" => r, "folder" => f}}) do
    %{
      stack_id: id,
      stack_name: name,
      stack_url: Console.url("/stacks/#{id}"),
      git_repository_url: url,
      git_ref: r,
      stack_folder: f
    }
  end
  defp stack_attrs(_), do: %{}
end
