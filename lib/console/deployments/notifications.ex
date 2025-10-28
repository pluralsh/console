defmodule Console.Deployments.Notifications do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Schema.{
    NotificationSink,
    NotificationRouter,
    User,
    AppNotification,
    SharedSecret,
    Group,
    PolicyBinding
  }

  require Logger

  @type error :: Console.error
  @type router_resp :: {:ok, NotificationRouter.t} | error
  @type sink_resp :: {:ok, NotificationSink.t} | error
  @type secret_resp :: {:ok, SharedSecret.t} | error

  def get_router!(id), do: Repo.get!(NotificationRouter, id)

  def get_router(id), do: Repo.get(NotificationRouter, id)

  def get_router_by_name(name), do: Repo.get_by(NotificationRouter, name: name)

  def get_sink!(id), do: Repo.get!(NotificationSink, id)

  def get_sink(id), do: Repo.get(NotificationSink, id)

  def get_sink_by_name(name), do: Repo.get_by(NotificationSink, name: name)

  def webhook_url(path) do
    Path.join([Console.conf(:webhook_url), "ext", path])
  end

  @doc """
  Bulk creates notifications from given data, to be used internally in notification router code
  """
  @spec create_notifications([map]) :: {:ok, [AppNotification.t]} | error
  def create_notifications(notifs) do
    notifs = Enum.map(notifs, &timestamped/1)
    AppNotification
    |> Repo.insert_all(notifs, returning: true)
    |> elem(1)
    |> ok()
  end

  @doc """
  Marks any unread notifications as read
  """
  @spec read_notifications(User.t) :: {:ok, integer} | error
  def read_notifications(%User{id: uid}) do
    AppNotification.for_user(uid)
    |> AppNotification.unread()
    |> Repo.update_all(set: [read_at: Timex.now()])
    |> elem(0)
    |> ok()
  end


  @doc """
  It can create a one-time-download shared secret
  """
  @spec share_secret(map, User.t) :: secret_resp
  def share_secret(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:secret, fn _ ->
      %SharedSecret{}
      |> SharedSecret.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_operation(:notifs, fn %{secret: %{notification_bindings: bindings} = share} ->
      splat_userids(bindings)
      |> Enum.map(& %{priority: :high, user_id: &1, text: secret_blob(user, share)})
      |> create_notifications()
    end)
    |> execute(extract: :secret)
    |> notify(:create, user)
  end

  @doc """
  Read and consume a shared secret
  """
  @spec consume_secret(binary, User.t) :: secret_resp
  def consume_secret(handle, %User{} = user) do
    Repo.get_by!(SharedSecret, handle: handle)
    |> Repo.preload([:notification_bindings])
    |> allow(user, :consume)
    |> when_ok(:delete)
  end

  @doc """
  Create or update a notification sink
  """
  @spec upsert_sink(map, User.t) :: sink_resp
  def upsert_sink(%{name: name} = attrs, %User{} = user) do
    case get_sink_by_name(name) do
      %NotificationSink{} = sink -> sink
      _ -> %NotificationSink{}
    end
    |> Repo.preload([:notification_bindings])
    |> NotificationSink.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Create or update a notification router
  """
  @spec upsert_router(map, User.t) :: router_resp
  def upsert_router(%{name: name} = attrs, %User{} = user) do
    case get_router_by_name(name) do
      %NotificationRouter{} = router -> Repo.preload(router, [:filters, :router_sinks])
      _ -> %NotificationRouter{}
    end
    |> NotificationRouter.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Deletes a sink by id
  """
  @spec delete_sink(binary, User.t) :: sink_resp
  def delete_sink(id, %User{} = user) do
    get_sink!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Deletes a router by id
  """
  @spec delete_router(binary, User.t) :: router_resp
  def delete_router(id, %User{} = user) do
    get_router!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Actually deliver a notification for a given sink
  """
  @spec deliver(binary, map, NotificationSink.t) :: {:ok, term} | error
  def deliver(event, map, %NotificationSink{} = sink) do
    update_blob(sink.type, event, map)
    |> deliver(sink)
  end

  defp deliver(body, %NotificationSink{type: :slack, configuration: %{slack: %{url: url}}}),
    do: url_deliver(url, body)

  defp deliver(body, %NotificationSink{type: :teams, configuration: %{teams: %{url: url}}}),
    do: url_deliver(url, body)

  defp deliver(body, %NotificationSink{type: :plural} = sink) do
    %{notification_bindings: bindings} = Repo.preload(sink, [notification_bindings: [group: :members]])
    splat_userids(bindings)
    |> Enum.map(&Map.merge(%{text: body, user_id: &1}, attrs(sink)))
    |> create_notifications()
    |> send_events()
  end

  def deliver_individually(event, map, user_id) when is_binary(user_id) do
    body = update_blob(:plural, event, map)
    Enum.map([user_id], & %{text: body, user_id: &1, urgent: true, priority: :low})
    |> create_notifications()
    |> send_events()
  end

  defp url_deliver(url, body) do
    HTTPoison.post(url, body, [
      {"content-type", "application/json"},
      {"accept", "application/json"}
    ])
    |> log_errors()
  end

  defp update_blob(type, event, map) do
    Path.join([:code.priv_dir(:console), "notifications", "#{type}", "#{event}.json.eex"])
    |> EEx.eval_file(assigns: Map.to_list(map))
  end

  defp log_errors({:ok, %HTTPoison.Response{status_code: c, body: b}}) when is_integer(c) and (c < 200 or c >= 300) do
    Logger.error "Failed to deliver incoming webhook: #{b}"
  end
  defp log_errors(pass), do: pass

  defp secret_blob(user, share) do
    Path.join([:code.priv_dir(:console), "notifications", "secret.txt.eex"])
    |> EEx.eval_file(assigns: [user: user, handle: share.handle])
  end

  defp splat_userids(bindings) do
    Enum.flat_map(bindings, fn
      %PolicyBinding{user_id: id} when is_binary(id) -> [id]
      %PolicyBinding{group: %Group{members: [_ | _] = members}} ->
        Enum.map(members, & &1.user_id)
      _ -> []
    end)
  end

  defp attrs(%NotificationSink{configuration: %{plural: %{} = plural}}) do
    %{priority: Map.get(plural, :priority) || :low, urgent: !!Map.get(plural, :urgent)}
  end
  defp attrs(_), do: %{priority: :low}


  defp send_events({:ok, [_ | _] = notifs}) do
    Enum.each(notifs, &handle_notify(PubSub.AppNotificationCreated, &1))
    {:ok, notifs}
  end
  defp send_events(pass), do: pass

  defp notify({:ok, %SharedSecret{} = share}, :create, user),
    do: handle_notify(PubSub.SharedSecretCreated, share, actor: user)
  defp notify(pass, _, _), do: pass
end
