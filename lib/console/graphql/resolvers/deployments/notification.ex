defmodule Console.GraphQl.Resolvers.Deployments.Notification do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Notifications
  alias Console.Schema.{NotificationSink, NotificationRouter, AppNotification}

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

  def list_notifications(args, %{context: %{current_user: user}}) do
    AppNotification.for_user(user.id)
    |> AppNotification.ordered()
    |> paginate(args)
  end

  def unread_notifications(_, %{context: %{current_user: user}}) do
    AppNotification.for_user(user.id)
    |> AppNotification.unread()
    |> Console.Repo.aggregate(:count)
    |> ok()
  end

  def read_notifications(_, %{context: %{current_user: user}}),
    do: Notifications.read_notifications(user)

  def resolve_sink(%{id: id}, _) when is_binary(id), do: {:ok, Notifications.get_sink(id)}
  def resolve_sink(%{name: name}, _), do: {:ok, Notifications.get_sink_by_name(name)}

  def resolve_router(%{id: id}, _) when is_binary(id), do: {:ok, Notifications.get_router(id)}
  def resolve_router(%{name: name}, _), do: {:ok, Notifications.get_router_by_name(name)}

  def upsert_sink(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Notifications.upsert_sink(attrs, user)

  def upsert_router(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Notifications.upsert_router(attrs, user)

  def delete_sink(%{id: id}, %{context: %{current_user: user}}),
    do: Notifications.delete_sink(id, user)

  def delete_router(%{id: id}, %{context: %{current_user: user}}),
    do: Notifications.delete_router(id, user)

  def share_secret(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Notifications.share_secret(attrs, user)

  def consume_secret(%{handle: handle}, %{context: %{current_user: user}}),
    do: Notifications.consume_secret(handle, user)
end
