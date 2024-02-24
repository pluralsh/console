defmodule Console.GraphQl.Resolvers.Deployments.Notification do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Notifications
  alias Console.Schema.{NotificationSink, NotificationRouter}

  def list_sinks(args, _) do
    NotificationSink.ordered()
    |> maybe_search(NotificationSink, args)
    |> paginate(args)
  end

  def list_routers(args, _) do
    NotificationRouter.ordered()
    |> maybe_search(NotificationRouter, args)
    |> paginate(args)
  end

  def resolve_sink(%{id: id}, _) when is_binary(id), do: {:ok, Notifications.get_sink(id)}
  def resolve_sink(%{name: name}, _), do: {:ok, Notifications.get_sink_by_name(name)}

  def resolve_router(%{id: id}, _) when is_binary(id), do: {:ok, Notifications.get_router(id)}
  def resolve_router(%{name: name}, _), do: {:ok, Notifications.get_router_by_name(name)}

  def upsert_sink(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Notifications.upsert_sink(attrs, user)

  def upsert_router(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Notifications.upsert_router(attrs, user)

  def delete_sink(%{id: id}, %{context: %{current_user: user}}), do: Notifications.delete_sink(id, user)

  def delete_router(%{id: id}, %{context: %{current_user: user}}), do: Notifications.delete_router(id, user)
end
