defmodule Console.Compliance.Datasource.ClustersTest do
  use Console.DataCase, async: true

  test "it includes read and write users in the compliance report" do
    user1 = insert(:user, email: "user1@example.com")
    user2 = insert(:user, email: "user2@example.com")
    group = insert(:group, name: "compliance-group")

    cluster = insert(:cluster, read_bindings: [%{user_id: user1.id}, %{group_id: group.id}], write_bindings: [%{user_id: user2.id}])

    clusters_content = Console.Compliance.Datasource.Clusters.stream()
    |> CSV.encode(headers: true)
    |> Enum.to_list()
    |> Enum.join()

    assert clusters_content =~ "user1@example.com"
    assert clusters_content =~ "group:compliance-group"
    assert clusters_content =~ "user2@example.com"
  end
end
