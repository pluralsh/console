defmodule Console.GraphQl.Resolvers.Deployments.Settings do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Settings, Services}
  alias Console.Schema.Project

  def get_project(args, %{context: %{current_user: user}}) do
    fetch_project(args)
    |> allow(user, :read)
  end

  def list_projects(args, %{context: %{current_user: user}}) do
    Project.for_user(user)
    |> Project.ordered()
    |> maybe_search(Project, args)
    |> paginate(args)
  end

  def create_project(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.create_project(attrs, user)

  def update_project(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Settings.update_project(attrs, id, user)

  def delete_project(%{id: id}, %{context: %{current_user: user}}),
    do: Settings.delete_project(id, user)

  def settings(_, _), do: {:ok, Settings.fetch_consistent()}

  def enable(_, %{context: %{current_user: user}}), do: Settings.enable(user)

  def self_manage(%{values: values}, %{context: %{current_user: user}}),
    do: Services.self_manage(values, user)

  def update_settings(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.update(attrs, user)

  def dismiss_onboarding(_, %{context: %{current_user: _user}}), do: Settings.onboarded()

  defp fetch_project(%{id: id}) when is_binary(id), do: Settings.get_project!(id)
  defp fetch_project(%{name: name}), do: Settings.get_project_by_name!(name)
end
