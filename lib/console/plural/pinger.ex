defmodule Console.Plural.Pinger do
  use GenServer
  alias Console.Deployments.Statistics
  alias Console.Plural.{Upgrades}
  require Logger

  defmodule State do
    defstruct [:upgrades, :queue_id, :target, :last, :poll_timer, :resource_timer, :cluster]
  end

  @poll_interval :timer.minutes(15)
  @resource_interval :timer.minutes(60)

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    if Console.conf(:initialize) do
      send self(), :elect
      :timer.send_interval(:timer.seconds(30), :elect)
    end
    {:ok, %State{}}
  end

  def handle_call(:state, _, state), do: {:reply, state, state}
  def handle_call(:ping, _, state), do: {:reply, :pong, state}
  def handle_call(:usage, _, state), do: {:reply, :ok, state}

  def handle_info(:elect, state) do
    Logger.info "attepting plural pinger leader election, pid=#{inspect(self())}"

    case {leader?(), Console.Features.check_license()} do
      {true, :ignore} -> {:noreply, start_timers(state)}
      _ -> {:noreply, stop_timers(state)}
    end
  end

  def handle_info(:svcs, %{resource_timer: t, cluster: %{} = cluster} = state) when not is_nil(t) do
    Upgrades.ping_cluster(cluster, to_gql(Statistics.info()))
    {:noreply, state}
  end

  def handle_info(:poll, %{poll_timer: t, cluster: %{} = cluster} = state) when not is_nil(t) do
    Upgrades.ping_cluster(cluster, nil)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}


  defp start_timers(%State{poll_timer: nil} = state) do
    Logger.info "Assuming plural ping leadership, pid=#{inspect(self())}"
    {:ok, ref}  = :timer.send_interval(@resource_interval, :svcs)
    {:ok, pref} = :timer.send_interval(@poll_interval, :poll)
    add_cluster(%{state  | poll_timer: pref, resource_timer: ref})
  end
  defp start_timers(state), do: state

  defp stop_timers(%State{poll_timer: nil, resource_timer: nil} = state),
    do: state
  defp stop_timers(%State{poll_timer: pt, resource_timer: rt} = state) do
    :timer.cancel(pt)
    :timer.cancel(rt)
    %{state | poll_timer: nil, resource_timer: nil}
  end

  defp add_cluster(%State{cluster: %{}} = state), do: state
  defp add_cluster(state) do
    cluster_attrs = %{
      gitUrl: mgmt_repo(),
      domain: Console.conf(:url),
      consoleUrl: Console.conf(:url),
      name: Console.conf(:cluster_name),
      legacy: !Console.byok?() && !Console.cloud?(),
      provider: to_provider(Console.conf(:provider))
    }
    %{state | cluster: cluster_attrs}
  end

  defp to_provider(:gcp), do: "GCP"
  defp to_provider(:aws), do: "AWS"
  defp to_provider(:azure), do: "AZURE"
  defp to_provider(:equinix), do: "EQUINIX"
  defp to_provider(_), do: "CUSTOM"

  defp to_gql(stats) do
    Console.move(stats, [:bytes_ingested], [:bytesIngested])
  end

  defp mgmt_repo() do
    case Console.Deployments.Settings.fetch() do
      %Console.Schema.DeploymentSettings{mgmt_repo: r} when is_binary(r) ->
        format_repo(r)
      _ -> Console.conf(:git_url)
    end
  end

  defp format_repo("https" <> _ = r), do: r
  defp format_repo("git@" <> _ = r), do: r
  defp format_repo(r) do
    case String.split(r, "/") do
      [_, _] -> "https://github.com/#{r}"
      _ -> r
    end
  end

  def leader?(), do: HashRing.Managed.key_to_node(:cluster, :leader) == node()
end
