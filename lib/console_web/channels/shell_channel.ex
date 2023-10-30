defmodule ConsoleWeb.ShellChannel do
  use ConsoleWeb, :channel
  alias Console.Kubernetes.PodExec
  alias Console.Deployments.{Clusters}
  alias Console.Services.Rbac
  require Logger

  def join("pod:" <> address, params, socket) do
    send(self(), {:connect_pod, String.split(address, ":"), params})
    {:ok, socket}
  end

  def handle_info({:connect_pod, [cluster_id, ns, n, container], params}, socket) do
    cluster = Clusters.get_cluster(cluster_id)
    server = Clusters.control_plane(cluster, socket.assigns.user)
    url = PodExec.exec_url(ns, n, container, command_opts(params))
    case PodExec.start_link(url, self(), server) do
      {:ok, pid} -> {:noreply, populate_socket(socket, ns, n, container, pid)}
      err ->
        Logger.info "failed to exec pod with #{inspect(err)}"
        {:stop, {:shutdown, :failed_exec}, socket}
    end
  end

  def handle_info({:connect_pod, [namespace, name, container], params}, socket) do
    url = PodExec.exec_url(namespace, name, container, command_opts(params))
    with :ok <- Rbac.allow(socket.assigns.user, namespace, :operate),
         {:ok, pid} <- PodExec.start_link(url, self()) do
      {:noreply, populate_socket(socket, namespace, name, container, pid)}
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

  def handle_in("resize", %{"width" => w, "height" => h}, socket) do
    PodExec.resize(socket.assigns.wss_pid, w, h)
    |> IO.inspect()

    {:reply, :ok, socket}
  end

  defp command_opts(%{"command" => c}), do: [command: c]
  defp command_opts(_), do: []

  defp fmt_cmd(cmd) when is_binary(cmd), do: cmd
  defp fmt_cmd(cmd) when is_list(cmd), do: Enum.join(cmd, " ")

  defp populate_socket(socket, namespace, name, container, pid) do
    socket
    |> assign(:namespace, namespace)
    |> assign(:name, name)
    |> assign(:container, container)
    |> assign(:wss_pid, pid)
  end
end
