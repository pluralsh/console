defmodule Console.Deployments.Git.Discovery do
  @moduledoc """
  Responsible for determining which node a given repo agent lives on and starting
  it as needed.
  """
  alias Console.SmartFile
  alias Console.Deployments.Git.{Agent, Supervisor}
  alias Console.Schema.{GitRepository, Service}
  alias Console.Deployments.Local.Server

  @type error :: Console.error

  def start(%GitRepository{} = git), do: start_and_run(git, fn pid -> {:ok, pid} end)

  @spec fetch(Service.t) :: {:ok, SmartFile.t} | error
  def fetch(%Service{git: %Service.Git{}} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    with {:ok, opener, digest} <- maybe_rpc(repo, &Agent.fetch(&1, svc)),
      do: Server.fetch(digest, opener)
  end
  def fetch(_), do: {:error, "no git spec provided for this service"}

  @spec fetch(GitRepository.t, Service.Git.t) :: {:ok, SmartFile.t} | error
  def fetch(%GitRepository{} = repo, %Service.Git{} = ref) do
    with {:ok, opener, digest} <- maybe_rpc(repo, &Agent.fetch(&1, ref)),
      do: Server.fetch(digest, opener)
  end
  def fetch(_, _), do: {:error, "no git spec provided for this service"}

  @spec digest(GitRepository.t, Service.Git.t) :: {:ok, binary} | error
  def digest(%GitRepository{} = repo, ref), do: maybe_rpc(repo, &Agent.digest(&1, ref))

  @spec sha(GitRepository.t, Service.Git.t) :: {:ok, binary} | error
  def sha(%GitRepository{} = repo, ref), do: maybe_rpc(repo, &Agent.sha(&1, ref))

  @spec tags(GitRepository.t) :: {:ok, [binary]} | error
  def tags(%GitRepository{} = repo), do: maybe_rpc(repo, &Agent.tags/1)

  @spec changes(GitRepository.t, binary, binary, binary) :: {:ok, [binary] | :pass, binary} | error
  def changes(%GitRepository{} = repo, sha1, sha2, folder),
    do: maybe_rpc(repo, &Agent.changes(&1, sha1, sha2, folder))

  @spec docs(Service.t) :: {:ok, File.t} | error
  def docs(%Service{} = svc) do
    %{repository: repo} = Console.Repo.preload(svc, [:repository])
    maybe_rpc(repo, fn pid -> Agent.docs(pid, svc) end)
  end

  @spec addons(GitRepository.t) :: [Console.Deployments.AddOn.t]
  def addons(%GitRepository{} = repo), do: maybe_rpc(repo, &Agent.addons/1)

  @spec refs(GitRepository.t) :: {:ok, [binary]} | error
  def refs(%GitRepository{} = repo), do: maybe_rpc(repo, &Agent.refs/1)

  @spec kick(GitRepository.t) :: {:ok, GitRepository.t} | error
  def kick(%GitRepository{} = repo) do
    debounce = Timex.now() |> Timex.shift(seconds: -15)
    with true <- Timex.before?(repo.pulled_at, debounce),
         :ok <- maybe_rpc(repo, fn pid ->
            Agent.kick(pid)
            :ok
         end) do
      {:ok, repo}
    else
      _ -> {:error, "failed to kick git repository"}
    end
  end
  def kick(_), do: {:error, "not a git repository"}


  def maybe_rpc(%GitRepository{} = repo, fun) when is_function(fun, 1) do
    me = node()
    case agent_node(repo) do
      ^me -> start_and_run(repo, fun)
      n ->
        :erpc.call(n, __MODULE__, :start_and_run, [repo, fun], :timer.seconds(30))
        |> Console.handle_rpc()
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

  def agents(), do: Agent.local_agents()
  def agent_states(), do: Enum.map(agents(), &Agent.info/1)

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
