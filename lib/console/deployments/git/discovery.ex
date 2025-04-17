defmodule Console.Deployments.Git.Discovery do
  @moduledoc """
  Responsible for determining which node a given repo agent lives on and starting
  it as needed.
  """
  alias Console.Deployments.Git.{Agent, Supervisor}
  alias Console.Schema.{GitRepository, Service}

  @type error :: Console.error

  @spec fetch(Service.t) :: {:ok, File.t} | error
  def fetch(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    with {:ok, pid} <- find(repo),
      do: Agent.fetch(pid, svc)
  end

  @spec fetch(GitRepository.t, Service.Git.t) :: {:ok, File.t} | error
  def fetch(%GitRepository{} = repo, ref) do
    with {:ok, pid} <- find(repo),
      do: Agent.fetch(pid, ref)
  end

  def digest(%GitRepository{} = repo, ref) do
    with {:ok, pid} <- find(repo),
      do: Agent.digest(pid, ref)
  end

  def sha(%GitRepository{} = repo, ref) do
    with {:ok, pid} <- find(repo),
      do: Agent.sha(pid, ref)
  end

  def tags(%GitRepository{} = repo) do
    with {:ok, pid} <- find(repo),
      do: Agent.tags(pid)
  end

  @spec changes(GitRepository.t, binary, binary, binary) :: {:ok, [binary] | :pass, binary} | error
  def changes(%GitRepository{} = repo, sha1, sha2, folder) do
    with {:ok, pid} <- find(repo),
      do: Agent.changes(pid, sha1, sha2, folder)
  end

  @spec docs(Service.t) :: {:ok, File.t} | error
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

  @spec refs(GitRepository.t) :: {:ok, [binary]} | error
  def refs(%GitRepository{} = repo) do
    with {:ok, pid} <- find(repo),
      do: Agent.refs(pid)
  end

  @spec kick(GitRepository.t) :: {:ok, GitRepository.t} | error
  def kick(%GitRepository{} = repo) do
    debounce = Timex.now() |> Timex.shift(seconds: -15)
    with true <- Timex.before?(repo.pulled_at, debounce),
         {:ok, pid} <- find(repo),
          _ <- Agent.kick(pid),
      do: {:ok, repo}
  end
  def kick(_), do: {:error, "not a git repository"}

  def find(%GitRepository{} = repo) do
    case start(repo) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
      err -> err
    end
  end
  def find(_), do: {:error, "no git repository located"}

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
