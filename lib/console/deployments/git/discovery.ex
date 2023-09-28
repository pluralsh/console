defmodule Console.Deployments.Git.Discovery do
  @moduledoc """
  Responsible for determining which node a given repo agent lives on and starting
  it as needed.
  """
  alias Console.Deployments.Git.{Agent, Supervisor}
  alias Console.Schema.{GitRepository, Service}

  def fetch(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    case start(repo) do
      {:ok, pid} -> Agent.fetch(pid, svc)
      {:error, {:already_started, pid}} -> Agent.fetch(pid, svc)
      err -> err
    end
  end

  def docs(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    case start(repo) do
      {:ok, pid} -> Agent.docs(pid, svc)
      {:error, {:already_started, pid}} -> Agent.docs(pid, svc)
      err -> err
    end
  end

  def start(%GitRepository{} = repo) do
    me = node()
    case agent_node(repo) do
      ^me -> Supervisor.start_child(repo)
      n -> :rpc.call(n, Supervisor, :start_child, [repo])
    end
  end

  def agent_node(%GitRepository{id: id}) do
    ring()
    |> HashRing.key_to_node(id)
  end

  def local?(%GitRepository{} = repo), do: agent_node(repo) == node()

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
