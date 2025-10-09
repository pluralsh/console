defmodule Console.Cached.Supervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      # Console.Cached.Namespace,
      # Console.Cached.Pod,
      # Console.Cached.VPN,
      # Console.Cached.Node,
      # Console.Cached.Cluster,
      Console.Cached.ClusterNodes,
      Console.Cached.HelmChart,
      # Console.Cached.Secret,
    ]

    filter(children, Console.conf(:nowatchers))
    |> Supervisor.init(strategy: :one_for_one, max_restarts: 15)
  end

  defp filter(_, true), do: [Console.Cached.ClusterNodes]
  defp filter(children, _), do: children
end
