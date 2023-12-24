defmodule Console.Deployments.Git.Discovery do
  @moduledoc """
  Responsible for determining which node a given repo agent lives on and starting
  it as needed.
  """
  alias Console.Deployments.Git.{Agent, Supervisor}
  alias Console.Schema.{GitRepository, Service}

  @spec fetch(Service.t) :: {:ok, File.t} | Console.error
  def fetch(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    with {:ok, pid} <- find(repo),
      do: Agent.fetch(pid, svc)
  end

  @spec docs(Service.t) :: {:ok, File.t} | Console.error
  def docs(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    with {:ok, pid} <- find(repo),
      do: Agent.docs(pid, svc)
  end

  @spec addons(GitRepository.t) :: [Console.Deployments.AddOn.t]
  def addons(%GitRepository{} = repo) do
    with {:ok, pid} <- find(repo),
      do: Agent.addons(pid)
  end

  @spec refs(GitRepository.t) :: {:ok, [binary]}
  def refs(%GitRepository{} = repo) do
    with {:ok, pid} <- find(repo),
      do: Agent.refs(pid)
  end

  def find(%GitRepository{} = repo) do
    case start(repo) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
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
