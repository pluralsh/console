defmodule Console.Deployments.Sentinel.Impl.Log do
  use GenServer
  import Console.Deployments.Sentinel.Impl.Base
  import Console.Schema.Base, only: [parse_duration: 1, seconds: 1]
  alias Console.Schema.Sentinel.SentinelCheck
  alias Console.Schema.Sentinel.SentinelCheck.CheckConfiguration
  alias Console.Schema.Sentinel.SentinelCheck.CheckConfiguration.LogConfiguration
  alias Console.Logs.{Query, Provider}

  @preface """
  You are a seasoned reliability engineer and are trying to evaluate the health of a given system.  You will
  be given a series of logs and should determine whether or not to consider them to pass your health checks or not.

  In either case, be sure to give a clear reason for your choice to make it clear to everyone your reasoning.
  """

  @interval :timer.seconds(15)

  defmodule State, do: defstruct [:check, :config, :pid, :latest, logs: [], rules: %{}]

  def start(%SentinelCheck{} = check, pid, rules) do
    GenServer.start(__MODULE__, {check, pid, rules})
  end

  def init({%SentinelCheck{configuration: %CheckConfiguration{log: log}} = check, pid, rules}) do
    :timer.send_interval(@interval, self(), :poll)
    state = %State{
      check: check,
      config: log,
      pid: pid,
      latest: DateTime.utc_now(),
      rules: rules
    }
    {:ok, state, {:continue, :setup}}
  end

  def handle_continue(:setup, %State{config: config} = state), do: setup_duration(config, state)

  def handle_info(:done, %State{logs: [], pid: pid} = state) do
    post_status(pid, %{status: :success, reason: "No logs found"})
    {:stop, :normal, state}
  end

  def handle_info(:done, %State{logs: logs, pid: pid} = state) do
    Enum.map(logs, &Map.from_struct/1)
    |> Enum.map(&Jason.encode!/1)
    |> maybe_add_rule(state)
    |> prepend("Here are all the logs that were found, I'll list them in json format:")
    |> user_msgs()
    |> ai_call(@preface)
    |> case do
      {:ok, %{} = status} ->
        post_status(pid, status)
      {:error, err} ->
        post_status(pid, %{status: :failed, reason: err})
      :ignore -> :ok
    end

    {:stop, :normal, state}
  end

  def handle_info(:poll, %State{config: config, logs: logs} = state) do
    build_query(config, state)
    |> Provider.query()
    |> case do
      {:ok, new_logs} ->
        {:noreply, %{state | logs: Enum.concat(logs, new_logs), latest: DateTime.utc_now()}}
      _ -> {:noreply, state}
    end
  end

  def handle_info(_, state), do: {:noreply, state}

  defp build_query(%LogConfiguration{query: q, cluster_id: c, namespaces: ns} = conf, %State{latest: l}) do
    Query.new(
      query: q,
      cluster_id: c,
      namespaces: ns,
      facets: conf.facets,
      limit: 100,
      time: %{after: l, reverse: true}
    )
  end

  defp setup_duration(%LogConfiguration{duration: duration}, state) when is_binary(duration) do
    case parse_duration(duration) do
      {:ok, duration} ->
        timeout = :timer.seconds(seconds(duration))
        Process.send_after(self(), :done, timeout)
        {:noreply, state}
      {:error, _} ->
        {:stop, :normal, :invalid_duration}
    end
  end
  defp setup_duration(_, _), do: {:stop, :normal, :invalid_duration}

  defp maybe_add_rule(msgs, %State{rules: %{} = rules, check: %SentinelCheck{rule_file: rule_file}})
       when is_binary(rule_file) do
    case Map.fetch(rules, rule_file) do
      {:ok, rule} when is_binary(rule) ->
        prepend(msgs, "Here is the guidance you should use when interpreting all log data:\n#{rule}\n\n")
      _ -> msgs
    end
  end
  defp maybe_add_rule(msgs, _), do: msgs
end
