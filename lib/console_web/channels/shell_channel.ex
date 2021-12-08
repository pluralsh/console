defmodule ConsoleWeb.ShellChannel do
  use ConsoleWeb, :channel

  def join("pod:" <> address, _, socket) do
    send(self(), {:connect_pod, String.split(address, ":")})
    {:ok, socket}
  end

  def handle_info({:connect_pod, [namespace, name, container]}, socket) do
    args = ["exec", name, "-it", "-c", container, "-n", namespace, "--", "/bin/sh"]
    process = Porcelain.spawn("kubectl", args, in: :receive)

    {:noreply, socket
          |> assign(:namespace, namespace)
          |> assign(:name, name)
          |> assign(:container, container)
          |> assign(:proc, process)}
  end
  def handle_info({:connect_pod, _}, socket), do: {:stop, {:shutdown, :invalid_room}, socket}

  def handle_info({_, :data, :out, data}, socket) do
    push(socket, "stdo", %{message: IO.iodata_to_binary(data)})
    {:noreply, socket}
  end

  def handle_info({_, :result, _}, socket), do: {:stop, {:shutdown, :finiahed}, socket}

  def handle_in("command", %{"cmd" => cmd}, socket) do
    result = Porcelain.Process.send_input(socket.assigns.proc, cmd) |> IO.inspect()
    {:reply, {:ok, %{stdout: IO.iodata_to_binary(result)}}, socket}
  end
end
