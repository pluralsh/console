defmodule Console.Deployments.Git.Discovery do
  @moduledoc """
  Responsible for determining which node a given repo agent lives on and starting
  it as needed.
  """
  alias Console.Deployments.Git.{Agent, Supervisor}
  alias Console.Schema.{GitRepository, Service}

  @type error :: Console.error

  def start(%GitRepository{} = git), do: start_and_run(git, fn pid -> {:ok, pid} end)

  @spec fetch(Service.t) :: {:ok, File.t} | error
  def fetch(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    maybe_rpc(repo, fn pid -> Agent.fetch(pid, svc) end)
  end

  @spec fetch(GitRepository.t, Service.Git.t) :: {:ok, File.t} | error
  def fetch(%GitRepository{} = repo, ref) do
    maybe_rpc(repo, fn pid -> Agent.fetch(pid, ref) end)
  end

  def digest(%GitRepository{} = repo, ref) do
    maybe_rpc(repo, fn pid -> Agent.digest(pid, ref) end)
  end

  def sha(%GitRepository{} = repo, ref) do
    maybe_rpc(repo, fn pid -> Agent.sha(pid, ref) end)
  end

  def tags(%GitRepository{} = repo) do
    maybe_rpc(repo, fn pid -> Agent.tags(pid) end)
  end

  @spec changes(GitRepository.t, binary, binary, binary) :: {:ok, [binary] | :pass, binary} | error
  def changes(%GitRepository{} = repo, sha1, sha2, folder) do
    maybe_rpc(repo, fn pid -> Agent.changes(pid, sha1, sha2, folder) end)
  end

  @spec docs(Service.t) :: {:ok, File.t} | error
  def docs(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    maybe_rpc(repo, fn pid -> Agent.docs(pid, svc) end)
  end

  @spec addons(GitRepository.t) :: [Console.Deployments.AddOn.t]
  def addons(%GitRepository{} = repo) do
    maybe_rpc(repo, fn pid -> Agent.addons(pid) end)
  end

  @spec refs(GitRepository.t) :: {:ok, [binary]} | error
  def refs(%GitRepository{} = repo) do
    maybe_rpc(repo, fn pid -> Agent.refs(pid) end)
  end

  @spec kick(GitRepository.t) :: {:ok, GitRepository.t} | error
  def kick(%GitRepository{} = repo) do
    debounce = Timex.now() |> Timex.shift(seconds: -15)
    with true <- Timex.before?(repo.pulled_at, debounce),
         :ok <- maybe_rpc(repo, fn pid ->
            Agent.kick(pid)
            :ok
         end),
      do: {:ok, repo}
  end
  def kick(_), do: {:error, "not a git repository"}


  def maybe_rpc(%GitRepository{} = repo, fun) when is_function(fun, 1) do
    me = node()
    case agent_node(repo) do
      ^me -> start_and_run(repo, fun)
      n -> :erpc.call(n, __MODULE__, :start_and_run, [repo, fun], :timer.seconds(30))
    end
  end

  def start_and_run(%GitRepository{} = repo, fun) when is_function(fun, 1) do
    case Supervisor.start_child(repo) do
      {:ok, pid} -> fun.(pid)
      {:error, {:already_started, pid}} -> fun.(pid)
      err -> err
    end
  end
  def start_and_run(_, _), do: {:error, "no git repository located"}

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
