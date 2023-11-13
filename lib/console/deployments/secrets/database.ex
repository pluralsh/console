defmodule Console.Deployments.Secrets.Database do
  @behaviour Console.Deployments.Secrets.Store
  import Console.Services.Base, only: [ok: 1, timestamped: 1]
  alias Console.Schema.{ServiceConfiguration}

  def fetch(revision) do
    ServiceConfiguration.for_revision(revision)
    |> Console.Repo.all()
    |> Enum.into(%{}, & {&1.name, &1.value})
    |> ok()
  end

  def store(revision, secrets) do
    secret_data = Enum.map(secrets, fn {k, v} -> timestamped(%{name: k, value: v, revision_id: revision}) end)
    case Console.Repo.insert_all(ServiceConfiguration, secret_data) do
      {count, _} when count >= map_size(secrets) -> {:ok, secrets}
      {count, _} -> {:error, "failed to create #{map_size(secrets) - count} secrets"}
    end
  end

  def delete(revision) do
    ServiceConfiguration.for_revision(revision)
    |> Console.Repo.delete_all()

    :ok
  end
end
