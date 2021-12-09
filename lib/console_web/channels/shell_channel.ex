defmodule ConsoleWeb.ShellChannel do
  use ConsoleWeb, :channel
  alias Console.Kubernetes.PodExec

  def join("pod:" <> address, _, socket) do
    send(self(), {:connect_pod, String.split(address, ":")})
    {:ok, socket}
  end

  def handle_info({:connect_pod, [namespace, name, container]}, socket) do
    url = PodExec.exec_url(namespace, name, container)
    with {:ok, pid} <- PodExec.start_link(url, self()) do
      {:noreply, socket
                 |> assign(:namespace, namespace)
                 |> assign(:name, name)
                 |> assign(:container, container)
                 |> assign(:wss_pid, pid)}
    else
      err ->
        {:stop, {:shutdown, :failed_exec}, socket}
    end
  end
  def handle_info({:connect_pod, _}, socket), do: {:stop, {:shutdown, :invalid_room}, socket}

  def handle_info({:stdo, data}, socket) do
    push(socket, "stdo", %{message: data})
    {:noreply, socket}
  end

  def handle_in("command", %{"cmd" => cmd}, socket) do
    PodExec.command(socket.assigns.wss_pid, fmt_cmd(cmd))
    {:reply, :ok, socket}
  end

  defp fmt_cmd(cmd) when is_binary(cmd), do: cmd
  defp fmt_cmd(cmd) when is_list(cmd), do: Enum.join(cmd, " ")
end
