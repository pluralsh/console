defmodule Console.Deployments.Notifications do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{NotificationSink, NotificationRouter, User}

  @type error :: Console.error
  @type router_resp :: {:ok, NotificationRouter.t} | error
  @type sink_resp :: {:ok, NotificationSink.t} | error

  def get_router!(id), do: Repo.get!(NotificationRouter, id)

  def get_router(id), do: Repo.get(NotificationRouter, id)

  def get_router_by_name(name), do: Repo.get_by(NotificationRouter, name: name)

  def get_sink!(id), do: Repo.get!(NotificationSink, id)

  def get_sink(id), do: Repo.get(NotificationSink, id)

  def get_sink_by_name(name), do: Repo.get_by(NotificationSink, name: name)

  @doc """
  Create or update a notification sink
  """
  @spec upsert_sink(map, User.t) :: sink_resp
  def upsert_sink(%{name: name} = attrs, %User{} = user) do
    case get_sink_by_name(name) do
      %NotificationSink{} = sink -> sink
      _ -> %NotificationSink{}
    end
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

  defp url_deliver(url, body) do
    HTTPoison.post(url, body, [
      {"content-type", "application/json"},
      {"accept", "application/json"}
    ])
  end

  defp update_blob(type, event, map) do
    Path.join([:code.priv_dir(:console), "notifications", "#{type}", "#{event}.json.eex"])
    |> EEx.eval_file(assigns: Map.to_list(map))
  end
end
