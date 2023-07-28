defmodule Console.Services.Databases do
  use Console.Services.Base
  import Kube.Utils
  alias Console.Schema.PostgresInstance
  alias Kube.Client
  alias Kube.Postgresql
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  @type error :: {:error, term}
  @type postgres_resp :: {:ok, Postgresql.t} | error
  @type postgres_instance_resp :: {:ok, PostgresInstance.t} | error

  @doc """
  Lists the postgres dbs across all namespaces
  """
  @spec list_postgres() :: {:ok, [Postgresql.t]} | error
  def list_postgres() do
    with {:ok, %{items: items}} <- Client.list_postgresqls(),
      do: {:ok, items}
  end

  @doc """
  Gets the statefulset underlying a pg instance
  """
  @spec statefulset(Postgresql.t) :: Kube.Utils.statefulset_resp
  def statefulset(%Postgresql{metadata: %MetaV1.ObjectMeta{namespace: ns, name: name}}),
    do: get_statefulset(ns, name)

  @doc """
  Gets a postgres db by namespace/name pair
  """
  @spec get_postgres(binary, binary) :: postgres_resp
  def get_postgres(ns, name), do: Client.get_postgresql(ns, name)

  @doc """
  Restores a postgres db from the given timestamp, can optionally provide additional clone details
  """
  @spec restore_postgres(binary, binary, DateTime.t) :: postgres_resp
  def restore_postgres(ns, name, timestamp \\ Timex.now(), clone_attrs \\ %{}) do
    with {:ok, postgres} <- get_postgres(ns, name),
         {:ok, secrets} <- backup_secrets(postgres),
         {:ok, _} <- Client.delete_postgresql(ns, name),
         :ok <- check_secrets(ns, secrets),
         {:ok, _} <- restore_secrets(ns, secrets) do
      put_in(postgres.spec.clone, Console.merge([
        %Postgresql.Spec.Clone{
          cluster: name,
          uid: postgres.metadata.uid,
          timestamp: Timex.format!(timestamp, "{ISO:Extended}")
        },
        backup_credentials(),
        clone_attrs
      ]))
      |> clean()
      |> Client.create_postgresql(ns)
    end
  end

  @doc """
  creates a postgres instance record to preserve uid references
  """
  @spec create_postgres_instance(Postgresql.t) :: postgres_instance_resp
  def create_postgres_instance(%Postgresql{metadata: %MetaV1.ObjectMeta{namespace: ns, name: name, uid: uid}}) do
    %PostgresInstance{}
    |> PostgresInstance.changeset(%{namespace: ns, name: name, uid: uid})
    |> Console.Repo.insert()
  end

  @spec list_postgres_instances(Postgresql.t) :: [PostgresInstance.t]
  def list_postgres_instances(%Postgresql{metadata: %MetaV1.ObjectMeta{namespace: ns, name: name}}) do
    PostgresInstance.for_namespace(ns)
    |> PostgresInstance.for_name(name)
    |> PostgresInstance.ordered()
    |> Console.Repo.all()
  end

  defp backup_credentials() do
    case Console.conf(:backup_keys) do
      [_ | _] = keys -> Map.new(keys)
      _ -> %{}
    end
  end

  defp backup_secrets(%Postgresql{metadata: %{namespace: ns}} = postgres) do
    secret_backups(postgres)
    |> Enum.reduce(short_circuit(), fn {secret, backup}, circuit ->
      short(circuit, {secret, backup}, fn -> copy_secret(ns, secret, backup) end)
    end)
    |> execute()
  end

  defp check_secrets(ns, secrets, retry \\ 0)
  defp check_secrets(ns, secrets, retry) when retry <= 30 do
    Enum.map(secrets, fn {{secret, _}, _} -> secret end)
    |> Enum.reduce(short_circuit(), fn secret, circuit ->
      short(circuit, secret, fn ->
        case get_secret(ns, secret) do
          {:error, _} -> {:ok, :not_found}
          _ -> {:error, :secret_exists}
        end
      end)
    end)
    |> execute()
    |> case do
      {:ok, _} -> :ok
      _ ->
        :timer.sleep(1000)
        check_secrets(ns, secrets, retry + 1)
    end
  end
  defp check_secrets(_, _, _), do: :ok

  defp restore_secrets(ns, secrets) do
    Enum.reduce(secrets, short_circuit(), fn {{secret, backup}, _}, circuit ->
      short(circuit, secret, fn ->
        copy_secret(ns, backup, secret)
        delete_secret(ns, backup)
      end)
    end)
    |> execute()
  end

  defp secret_backups(%Postgresql{metadata: %{name: name}, spec: %Postgresql.Spec{users: users}}) do
    Enum.map(["postgres", "standby" | Map.keys(users)], fn user ->
      secret = secret_name(user, name)
      {secret, "zzz.#{secret}"}
    end)
  end

  defp secret_name(user, name), do: "#{user}.#{name}.credentials.postgresql.acid.zalan.do"
end
