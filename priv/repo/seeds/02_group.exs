import Botanist

alias Console.{Repo, Schema}

seed do
  {:ok, group} = Repo.insert(%Schema.Group{
    name: "general",
    description: "all users in the system",
    global: true
  })
  members =
    Repo.all(Schema.User)
    |> Enum.map(&Console.Services.Base.timestamped(%{user_id: &1.id, group_id: group.id}))
  Repo.insert_all(Schema.GroupMember, members)
end
