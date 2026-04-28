defmodule Console.AI.Tools.Workbench.Infrastructure.ClusterTags do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.Tag

  embedded_schema do
    field :user, :map, virtual: true
    field :tag, :string
    field :q, :string
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cluster_tags.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_cluster_tags"
  def description(_), do: "Get the tags for a cluster"

  @valid ~w(tag q)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  def implement(%__MODULE__{} = args) do
    Tag.cluster()
    |> tag_search_filters(args)
    |> Tag.ordered([asc: :name, asc: :value])
    |> Console.Repo.all()
    |> Enum.map(&tag_brief/1)
    |> Jason.encode()
  end

  defp tag_search_filters(query, args) do
    Map.take(args, @valid)
    |> Enum.reduce(query, fn
      {:tag, t}, q when is_binary(t) and byte_size(t) > 0 -> Tag.for_name(q, t)
      {:q, s}, q when is_binary(s) and byte_size(s) > 0 -> Tag.search(q, s)
      _, q -> q
    end)
  end

  defp tag_brief(%Tag{} = t) do
    %{
      name: t.name,
      value: t.value
    }
  end
end
