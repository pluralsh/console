defmodule Console.GraphQl.Resolvers.Deployments.Base do
  alias Console.Deployments.{Clusters, Services}
  alias Console.Schema.{User, Cluster, Tag}

  defmacro __using__(_opts) do
    quote do
      use Console.GraphQl.Resolvers.Base, model: Console.Schema.Cluster
      import Console.GraphQl.Resolvers.Deployments.Base
      import Console.Deployments.Policies, only: [allow: 3]
    end
  end

  def actor(%{context: %{current_user: %User{} = user}}), do: user
  def actor(%{context: %{cluster: %Cluster{} = cluster}}), do: cluster
  def actor(_), do: nil

  def fetch_service(%{id: id}) when is_binary(id), do: Services.get_service!(id)
  def fetch_service(%{cluster: cluster, name: name}) do
    cluster = Clusters.find!(cluster)
    Services.get_service_by_name!(cluster.id, name)
  end

  def maybe_search(query, module, %{q: q}) when is_binary(q), do: module.search(query, q)
  def maybe_search(query, _, _), do: query

  def tag_filters(query, args) do
    Enum.reduce(args, query, fn
      {:tag, t}, q -> Tag.for_name(q, t)
      _, q -> q
    end)
  end

  defmacro delegates(module) do
    module = Macro.to_string(module) |> String.split(".") |> Module.concat()
    module.__info__(:functions)
    |> Enum.filter(fn
      {:data, _} -> false
      {:query, _} -> false
      _ -> true
    end)
    |> Enum.map(fn {del, arity} ->
      quote do
        defdelegate unquote(del)(unquote_splicing(Macro.generate_arguments(arity, module))),
          to: unquote(module)
      end
    end)
  end
end
