import Botanist

alias Console.{Repo, Schema}

seed do
  group = Repo.get_by!(Schema.Group, name: "general")

  %Schema.Role{}
  |> Schema.Role.changeset(%{
    name: "read-only",
    description: "read only access to all resources",
    repositories: ["*"],
    permissions: %{read: true},
    role_bindings: [%{group_id: group.id}]
  })
  |> Repo.insert!()
end
