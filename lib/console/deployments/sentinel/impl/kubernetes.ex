defmodule Console.Deployments.Sentinel.Impl.Kubernetes do
  use GenServer
  import Console.Deployments.Sentinel.Impl.Base
  alias Console.Schema.Sentinel.SentinelCheck

  def start(%SentinelCheck{} = check, pid, rules) do
    GenServer.start(__MODULE__, {check, pid, rules})
  end

  def init({%SentinelCheck{} = check, pid, rules}) do
    send(self(), :done)
    {:ok, {check, pid, rules}}
  end

  def handle_info(:done, {check, pid, rules}) do
    post_status(pid, %{status: :success})
    {:stop, :normal, {check, pid, rules}}
  end
end
