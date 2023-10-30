defmodule Console.Watchers.Postgres do
  use Console.Watchers.Base
  alias Console.Services.Databases
  import Kube.Client.Base, only: [path_builder: 3]

  def handle_info(:start, state) do
    Logger.info "starting pod watcher"
    request = %Kazan.Request{
      method: "get",
      path: path_builder("acid.zalan.do", "v1", "postgresqls"),
      query_params: %{},
      response_model: Kube.Postgresql
    }
    case Watcher.start_link(request, send_to: self(), recv_timeout: 15_000) do
      {:ok, pid} ->
        send self(), :boot
        :timer.send_interval(5000, :watcher_ping)
        Process.link(pid)
        {:noreply, %{state | pid: pid}}
      err ->
        Logger.info "failed to watch postgres crds, this can often be a benign error: #{err}"
        Process.send_after(self(), :start, :timer.seconds(10))
        {:noreply, state}
    end
  end

  def handle_info(:boot, state) do
    {:ok, pgs} = Databases.list_postgres()
    Enum.each(pgs, &Databases.create_postgres_instance/1)
    {:noreply, state}
  end

  def handle_info(:watcher_ping, %{pid: pid} = state) do
    Logger.info "postgres k8s watcher alive at pid=#{inspect(pid)}"
    {:noreply, state}
  end

  def handle_info(%Watcher.Event{object: %Kube.Postgresql{} = pg, type: :create}, state) do
    Databases.create_postgres_instance(pg)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
