defmodule ConsoleWeb.ShellChannel do
  use ConsoleWeb, :channel
  alias Console.Kubernetes.PodExec
  alias Console.Services.Rbac
  require Logger

  def join("pod:" <> address, params, socket) do
    send(self(), {:connect_pod, String.split(address, ":"), params})
    {:ok, socket}
  end

  def handle_info({:connect_pod, [namespace, name, container], params}, socket) do
    url = PodExec.exec_url(namespace, name, container, command_opts(params))
    with :ok <- Rbac.allow(socket.assigns.user, namespace, :operate),
         {:ok, pid} <- PodExec.start_link(url, self()) do
      {:noreply, socket
                 |> assign(:namespace, namespace)
                 |> assign(:name, name)
                 |> assign(:container, container)
                 |> assign(:wss_pid, pid)}
    else
      err ->
        Logger.info "failed to exec pod with #{inspect(err)}"
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

  defp command_opts(%{"command" => c}), do: [command: c]
  defp command_opts(_), do: []

  defp fmt_cmd(cmd) when is_binary(cmd), do: cmd
  defp fmt_cmd(cmd) when is_list(cmd), do: Enum.join(cmd, " ")
end
