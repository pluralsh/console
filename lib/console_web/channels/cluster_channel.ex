defmodule ConsoleWeb.ClusterChannel do
  use ConsoleWeb, :channel

  def join("cluster:" <> id, _, socket) do
    send(self(), {:cluster, id})
    {:ok, socket}
  end

  def handle_info({:cluster, id}, %{assigns: %{cluster_id: id}} = socket),
    do: {:noreply, socket}
  def handle_info(_, socket), do: {:stop, {:shutdown, :invalid_room}, socket}
end
