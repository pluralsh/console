defprotocol Console.Deployments.PubSub.Notifiable do
  @fallback_to_any true

  @doc """
  Returns the payload and topics for a graphql subscription event
  """
  @spec message(term) :: {binary, list, map} | :ok
  def message(event)
end

defimpl Console.Deployments.PubSub.Notifiable, for: Any do
  def message(_), do: :ok
end

defmodule Console.Deployments.Notifications.Utils do
  alias Console.Schema.{Service, Cluster, Pipeline, PullRequest}
  def filters(%Service{id: id, cluster_id: cid}), do: [service_id: id, cluster_id: cid]
  def filters(%Cluster{id: id}), do: [cluster_id: id]
  def filters(%Pipeline{id: id}), do: [pipeline_id: id]
  def filters(%PullRequest{url: url}), do: [regex: url]
  def filters(_), do: []
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.Schema.Pipeline do
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.Schema.Cluster do
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: [
  Console.PubSub.ServiceUpdated,
] do
  alias Console.Deployments.Notifications.Utils
  def message(%{item: svc}) do
    svc = Console.Repo.preload(svc, [:cluster, :repository])
    {"service.update", Utils.filters(svc), %{service: svc, source: source(svc)}}
  end

  defp source(%{repository: %{url: url}, git: %{ref: ref, folder: folder}}), do: %{url: url, ref: "#{folder}@#{ref}"}
  defp source(%{helm: %{chart: c, version: v}}), do: %{url: c, ref: v}
  defp source(_), do: %{}
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.PullRequestCreated do
  alias Console.Deployments.Notifications.Utils

  def message(%{item: pr}) do
    {"pr.create", Utils.filters(pr), %{pr: pr}}
  end
end
