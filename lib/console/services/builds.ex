defmodule Console.Services.Builds do
  use Console.Services.Base
  alias Console.PubSub
  alias Kube.{Client, Application}
  alias Console.Schema.{Build, Command, User, Lock}
  alias Console.Services.{Changelogs, Rbac}
  alias Console.Plural.Incidents

  def get!(id), do: Repo.get!(Build, id)

  def get(id), do: Repo.get(Build, id)

  def get_running() do
    Build.with_status(:running)
    |> Build.first()
    |> Build.ordered(asc: :inserted_at)
    |> Repo.one()
  end

  def advisory_lock(val) do
    Ecto.Adapters.SQL.query(Repo,
      "SELECT pg_advisory_xact_lock($1)",
      [:erlang.phash2(val)]
    )
  end

  def lock(name, id) do
    start_transaction()
    |> add_operation(:advisor, fn _ -> advisory_lock(name) end)
    |> add_operation(:lock, fn _ ->
      Lock.active()
      |> Repo.get_by(name: name)
      |> case do
        nil -> {:ok, nil}
        _ -> {:error, :locked}
      end
    end)
    |> add_operation(:create, fn _ ->
      %Lock{name: name, holder: id}
      |> Lock.changeset(%{expires_at: Timex.now() |> Timex.shift(minutes: 3)})
      |> Repo.insert(on_conflict: :replace_all, conflict_target: [:name])
    end)
    |> execute(extract: :create)
  end

  def unlock(name, id) do
    start_transaction()
    |> add_operation(:lock, fn _ ->
      case Repo.get_by(Lock, name: name) do
        %Lock{holder: ^id} = lock -> {:ok, lock}
        %Lock{} -> {:error, :locked}
        nil -> {:ok, :empty}
      end
    end)
    |> add_operation(:delete, fn
      %{lock: %Lock{} = lock} -> Repo.delete(lock)
      _ -> {:ok, nil}
    end)
    |> execute(extract: :delete)
  end

  def restart(id, %User{} = user) do
    build = get!(id)
    with :ok <- Rbac.allow(user, build.repository, :deploy) do
      Piazza.Ecto.Schema.mapify(build)
      |> Map.put(:status, :queued)
      |> create(user)
    end
  end

  def create(attrs, %User{id: id} = user) do
    start_transaction()
    |> add_operation(:build, fn _ ->
      %Build{type: :deploy, status: :queued, creator_id: id}
      |> Build.changeset(attrs)
      |> Repo.insert()
    end)
    |> add_operation(:valid, fn
      %{build: %{type: :install} = build} -> {:ok, build}
      %{build: %{repository: repo} = build} ->
        case Client.get_application(repo) do
          {:ok, %Application{}} -> {:ok, build}
          _ -> {:error, :invalid_repository}
        end
    end)
    |> execute(extract: :build)
    |> notify(:create, user)
  end

  def cancel(%Build{id: id}) do
    start_transaction()
    |> add_operation(:build, fn _ -> {:ok, get(id)} end)
    |> add_operation(:update, fn
      %{build: %{status: :running} = build} ->
        modify_status(build, :cancelled)
      %{build: build} -> {:ok, build}
    end)
    |> execute(extract: :update)
    |> notify(:cancel)
  end

  def cancel(build_id, %User{} = user) do
    get!(build_id)
    |> modify_status(:cancelled)
    |> notify(:cancel, user)
  end

  def create_command(attrs, %Build{id: id}) do
    %Command{build_id: id}
    |> Command.changeset(attrs)
    |> Repo.insert()
    |> notify(:create)
  end

  def complete(%Command{stdout: stdout} = command, exit_code) do
    %{command | stdout: nil}
    |> Command.changeset(%{
      exit_code: exit_code,
      completed_at: Timex.now(),
      stdout: stdout
    })
    |> Repo.update()
    |> notify(:complete)
  end

  def cache_line(%Command{id: id}, stdo), do: Console.Cache.put({:command, id}, stdo, ttl: 360_000)

  def get_line(%Command{id: id, stdout: stdo}) do
    with nil <- Console.Cache.get({:command, id}),
      do: stdo
  end

  def clear_cache(%Command{id: id}), do: Console.Cache.delete({:command, id})

  def poll(id) do
    start_transaction()
    |> add_operation(:lock, fn _ -> lock("deployer", id) end)
    |> add_operation(:test, fn _ ->
      Build.with_status(:running)
      |> Repo.exists?()
      |> case do
        true -> {:error, :running}
        false -> {:ok, :none}
      end
    end)
    |> add_operation(:poll, fn _ ->
      Build.queued()
      |> Build.first()
      |> Build.ordered(asc: :inserted_at)
      |> Repo.one()
      |> case do
        nil -> {:error, :not_found}
        build -> {:ok, %{build | deployer: id}}
      end
    end)
    |> execute(extract: :poll)
  end

  def running(%{deployer: deployer} = build) do
    start_transaction()
    |> add_operation(:build, fn _ ->
      modify_status(build, :running)
    end)
    |> add_operation(:unlock, fn _ ->
      unlock("deployer", deployer)
    end)
    |> execute(extract: :build)
    |> notify(:update)
  end

  def pending(build) do
    start_transaction()
    |> add_operation(:build, fn _ ->
      modify_status(build, :pending)
    end)
    |> Changelogs.add_changelogs()
    |> execute(extract: :build)
    |> notify(:pending)
  end

  def approve(build_id, %User{id: user_id} = user) do
    get!(build_id)
    |> Build.changeset(%{
      approver_id: user_id,
      status: :running
    })
    |> Repo.update()
    |> notify(:approve, user)
  end

  def succeed(build) do
    storage = Console.storage()
    start_transaction()
    |> add_operation(:build, fn _ ->
      modify_status(build, :successful)
    end)
    |> Changelogs.add_changelogs()
    |> add_operation(:sha, fn %{build: build} ->
      with {:ok, sha} <- storage.revision() do
        build
        |> Build.changeset(%{sha: sha})
        |> Repo.update()
      end
    end)
    |> execute(extract: :sha)
    |> notify(:succeed)
  end

  def fail(build) do
    start_transaction()
    |> add_operation(:build, fn _ ->
      modify_status(build, :failed)
    end)
    |> Changelogs.add_changelogs()
    |> execute(extract: :build)
    |> notify(:failed)
  end

  def ping(build) do
    build
    |> Ecto.Changeset.change(%{pinged_at: Timex.now()})
    |> Repo.update()
  end

  def add_job_name(%Build{} = build, job_name) do
    Build.changeset(build, %{job_name: job_name})
    |> Repo.update()
  end

  def failed_incident(%Build{status: :failed, repository: repo} = build) do
    %{commands: commands} = Console.Repo.preload(build, [:commands])

    commands
    |> Enum.sort_by(& &1.completed_at, DateTime)
    |> Enum.find(& &1.exit_code != 0)
    |> case do
      %{stdout: stdo} ->
        Incidents.create_incident(repo, %{
          title: "Failed build for #{repo}",
          description: """
          Failed command output:

          ```
          #{stdo}
          ```
          """,
          severity: 2,
          tags: [%{tag: "builds"}, %{tag: "console"}],
          cluster_information: Console.Alertmanager.Incidents.cluster_info()
        })
      _ -> :ok
    end
  end

  defp modify_status(build, state) do
    cleaned(build)
    |> Build.changeset(add_completion(%{status: state}, state))
    |> Repo.update()
  end

  defp add_completion(attrs, state) when state in [:successful, :failed],
    do: Map.put(attrs, :completed_at, Timex.now())
  defp add_completion(attrs, _), do: attrs

  defp cleaned(build), do: %{build | changelogs: %Ecto.Association.NotLoaded{}}

  defp notify({:ok, %Build{} = build}, :create, user),
    do: handle_notify(PubSub.BuildCreated, build, actor: user)
  defp notify({:ok, %Build{} = build}, :approve, user),
    do: handle_notify(PubSub.BuildApproved, build, actor: user)
  defp notify({:ok, %Build{} = build}, :cancel, user),
    do: handle_notify(PubSub.BuildCancelled, build, actor: user)
  defp notify(error, _, _), do: error

  defp notify({:ok, %Command{} = command}, :create),
    do: handle_notify(PubSub.CommandCreated, command)
  defp notify({:ok, %Command{} = command}, :complete),
    do: handle_notify(PubSub.CommandCompleted, command)
  defp notify({:ok, %Build{} = build}, :succeed),
    do: handle_notify(PubSub.BuildSucceeded, build)
  defp notify({:ok, %Build{} = build}, :failed),
    do: handle_notify(PubSub.BuildFailed, build)
  defp notify({:ok, %Build{} = build}, :pending),
    do: handle_notify(PubSub.BuildPending, build)
  defp notify({:ok, %Build{} = build}, :update),
    do: handle_notify(PubSub.BuildUpdated, build)
  defp notify({:ok, %Build{status: :cancelled} = build}, :cancel),
    do: handle_notify(PubSub.BuildUpdated, build)

  defp notify({:ok, %Build{} = build}, :delete),
    do: handle_notify(PubSub.BuildDeleted, build)
  defp notify(error, _), do: error
end
