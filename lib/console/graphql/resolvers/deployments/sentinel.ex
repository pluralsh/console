defmodule Console.GraphQl.Resolvers.Deployments.Sentinel do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Sentinels
  alias Console.Schema.Sentinel

  def sentinel(%{id: id}, ctx) when is_binary(id) do
    Sentinels.get_sentinel!(id)
    |> allow(actor(ctx), :read)
  end
  def sentinel(%{name: name}, ctx) when is_binary(name) do
    Sentinels.get_sentinel_by_name!(name)
    |> allow(actor(ctx), :read)
  end
  def sentinel(_, _), do: {:error, "Must specify either id or name"}

  def sentinels(args, %{context: %{current_user: user}}) do
    Sentinel.ordered()
    |> Sentinel.for_user(user)
    |> maybe_search(Sentinel, args)
    |> paginate(args)
  end

  def create_sentinel(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Sentinels.create_sentinel(attrs, user)

  def update_sentinel(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Sentinels.update_sentinel(attrs, id, user)

  def delete_sentinel(%{id: id}, %{context: %{current_user: user}}),
    do: Sentinels.delete_sentinel(id, user)

  def run_sentinel(%{id: id}, %{context: %{current_user: user}}),
    do: Sentinels.run_sentinel(id, user)
end
