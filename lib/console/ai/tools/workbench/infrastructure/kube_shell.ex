defmodule Console.AI.Tools.KubeShellCollector do
  use GenServer
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]

  defmodule State do
    @hint "consider reducing output via pipes or other techniques to avoid truncation"

    defstruct [:activity, :callback_pid, :monitor_ref, seq: 0, stdo: []]

    def result(%__MODULE__{stdo: stdo}) do
      Enum.reverse(stdo)
      |> IO.iodata_to_binary()
      |> Console.AI.Tools.Workbench.Output.truncate(@hint)
    end
  end

  def start(opts) do
    GenServer.start(__MODULE__, opts)
  end

  def init(opts) do
    Process.send_after(self(), :timeout, :timer.minutes(60))
    Process.send_after(self(), :seppuku, :timer.minutes(70))
    {:ok, %State{
      callback_pid: opts[:callback_pid],
      activity: opts[:activity]
    }}
  end

  def monitor(pid, monitor_pid) do
    GenServer.call(pid, {:monitor, monitor_pid})
  end

  def output(pid), do: GenServer.call(pid, :output)

  def handle_call(:output, _, %State{} = s), do: {:reply, State.result(s), s}
  def handle_call({:monitor, monitor_pid}, _, %State{} = state) do
    ref = Process.monitor(monitor_pid)
    {:reply, :ok, %{state | monitor_ref: ref}}
  end

  def handle_info({:DOWN, ref, :process, _pid, _reason}, %State{callback_pid: callback_pid, monitor_ref: ref} = state) do
    send(callback_pid, :exec_stream_closed)
    {:noreply, state}
  end

  def handle_info({:stdo, frame}, %State{} = state) do
    {:noreply, emit(frame, state)}
  end

  def handle_info({:exec_status, status}, %State{callback_pid: callback_pid} = state) do
    send(callback_pid, {:exec_status, status})
    {:noreply, state}
  end

  def handle_info({:stream_closed, frame}, %State{callback_pid: callback_pid} = state) do
    send(callback_pid, :exec_stream_closed)
    {:noreply, emit(frame, state)}
  end

  def handle_info(:timeout, %State{callback_pid: callback_pid} = state) do
    send(callback_pid, :exec_stream_closed)
    {:noreply, state}
  end

  def handle_info(:seppuku, state) do
    {:stop, :normal, state}
  end
  def handle_info(_, s), do: {:noreply, s}

  defp emit(frame, %State{activity: %{id: id}, seq: seq, stdo: stdo} = state)
       when is_binary(frame) and is_binary(id) do
    publish_absinthe(
      %{activity_id: id, text: frame, seq: seq},
      workbench_exec_stream: "workbench_jobs:#{id}:exec_stream"
    )
    %{state | seq: seq + 1, stdo: [frame | stdo]}
  end
  defp emit(frame, %State{stdo: stdo} = state), do: %{state | stdo: [frame | stdo]}
end

defmodule Console.AI.Tools.Workbench.KubeShell do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.Deployments.Clusters
  alias Console.Kubernetes.PodExec
  alias Console.AI.Tools.KubeShellCollector

  @timeout :timer.minutes(30)

  embedded_schema do
    field :activity,    :map, virtual: true
    field :handle,      :string
    field :command,     :string
    field :namespace,   :string
    field :pod,         :string
    field :container,   :string
    field :explanation, :string
  end

  def new(attrs) do
    {:ok, struct(__MODULE__, attrs)}
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, ~w(handle command namespace pod container explanation)a)
    |> validate_required([:handle, :command])
  end

  def invoke(%__MODULE__{
        handle: handle,
        namespace: ns,
        pod: p,
        container: ct,
        command: command,
        activity: activity
      }, user) do
    cluster = Clusters.get_cluster_by_handle(handle)
    server = Clusters.control_plane(cluster, user)
    url = PodExec.exec_url(ns, p, ct, command: command, stdin: false)
    with {:ok, pid} <- KubeShellCollector.start(callback_pid: self(), activity: activity),
         {:ok, shell_pid} <- PodExec.start(url, pid, server) do
      KubeShellCollector.monitor(pid, shell_pid)
      try do
        case wait_for_result() do
          :ok -> {:ok, KubeShellCollector.output(pid)}
          {:error, reason} -> {:error, reason}
        end
      after
        Process.exit(shell_pid, :shutdown)
        Process.exit(pid, :shutdown)
      end
    else
      {:error, reason} ->
        {:error, "failed to execute shell command, check your RBAC permissions, you must have pod/exec on the given pod to perform this action: #{inspect reason}"}
    end
  end

  defp wait_for_result() do
    receive do
      {:exec_status, status} -> parse_exec_status(status)
      :exec_stream_closed -> :ok
    after
      @timeout -> {:error, "shell command timed out after 30 minutes"}
    end
  end

  defp parse_exec_status(status) do
    case Jason.decode(status) do
      {:ok, %{"status" => "Success"}} -> :ok
      {:ok, %{"message" => message}} when is_binary(message) -> {:error, message}
      {:ok, response} -> {:error, "unexpected Kubernetes exec status: #{inspect(response)}"}
      {:error, _} -> {:error, "invalid Kubernetes exec status: #{status}"}
    end
  end
end
