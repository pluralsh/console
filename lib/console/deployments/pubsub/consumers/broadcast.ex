defmodule Console.Deployments.PubSub.Broadcast do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100,
    protocol: Console.Deployments.PubSub.Broadcastable
  alias Console.Deployments.PubSub.Broadcastable


  def handle_event(event) do
    case Broadcastable.message(event) do
      {room, event, data} -> do_broadcast(room, event, data)
      [_ | _] = rooms -> Enum.each(rooms, fn {room, event, data} -> do_broadcast(room, event, data) end)
      pass -> pass
    end
  end

  defp do_broadcast(room, event, data) do
    gql_broadcast(room, event, data)
    Phoenix.Channel.Server.broadcast(Console.PubSub, room, event, data)
  end

  defp gql_broadcast("cluster:" <> cid, event, %{"id" => id} = data) do
    case event_to_resource(event) do
      :error -> :ok
      resource ->
        Absinthe.Subscription.publish(
          ConsoleWeb.Endpoint,
          %{resource: resource, resource_id: id, kick: data["kick"]},
          [deploy_agent_notification: "deploy_agent_notifications:#{cid}"]
        )
    end
  end
  defp gql_broadcast(_, _, _), do: :ok

  defp event_to_resource("gate" <> _), do: :gate
  defp event_to_resource("agent" <> _), do: :agent_run
  defp event_to_resource("stack" <> _), do: :stack_run
  defp event_to_resource("service.manifests" <> _), do: :error
  defp event_to_resource("service" <> _), do: :service
  defp event_to_resource(_), do: :error
end
