defmodule Console.GraphQl.Resolvers.Deployments.Settings do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Settings, Services}
  alias Console.Schema.{Project, CloudConnection}

  def get_project(args, %{context: %{current_user: user}}) do
    fetch_project(args)
    |> allow(user, :read)
  end

  def get_cloud_connection(%{id: id}, %{context: %{current_user: user}}) when is_binary(id) do
    Settings.get_cloud_connection!(id)
    |> allow(user, :read)
  end

  def get_cloud_connection(%{name: name}, %{context: %{current_user: user}}) when is_binary(name) do
    Settings.get_cloud_connection_by_name!(name)
    |> allow(user, :read)
  end

  def get_federated_credential(%{id: id}, _), do: {:ok, Settings.get_federated_credential!(id)}

  def list_projects(args, %{context: %{current_user: user}}) do
    Project.for_user(user)
    |> Project.ordered()
    |> maybe_search(Project, args)
    |> paginate(args)
  end

  def list_cloud_connections(args, %{context: %{current_user: user}}) do
    CloudConnection.for_user(user)
    |> CloudConnection.ordered()
    |> maybe_search(CloudConnection, args)
    |> paginate(args)
  end

  def create_project(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.create_project(attrs, user)

  def update_project(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Settings.update_project(attrs, id, user)

  def delete_project(%{id: id}, %{context: %{current_user: user}}),
    do: Settings.delete_project(id, user)

  def upsert_cloud_connection(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.upsert_cloud_connection(attrs, user)

  def delete_cloud_connection(%{id: id}, %{context: %{current_user: user}}),
    do: Settings.delete_cloud_connection(id, user)

  def settings(_, _), do: {:ok, Settings.fetch_consistent()}

  def enable(_, %{context: %{current_user: user}}), do: Settings.enable(user)

  def self_manage(%{values: values}, %{context: %{current_user: user}}),
    do: Services.self_manage(values, user)

  def update_settings(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.update(attrs, user)

  def dismiss_onboarding(_, %{context: %{current_user: _user}}), do: Settings.onboarded()

  def create_federated_credential(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.create_federated_credential(attrs, user)

  def update_federated_credential(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.update_federated_credential(attrs, id, user)

  def delete_federated_credential(%{id: id}, %{context: %{current_user: user}}),
    do: Settings.delete_federated_credential(id, user)

  defp fetch_project(%{id: id}) when is_binary(id), do: Settings.get_project!(id)
  defp fetch_project(%{name: name}), do: Settings.get_project_by_name!(name)
end
