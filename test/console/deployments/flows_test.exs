defmodule Console.Deployments.FlowsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Flows
  alias Console.PubSub

  describe "upsert_flow/2" do
    test "admins can create a flow" do
      admin = admin_user()

      {:ok, flow} = Flows.upsert_flow(%{name: "test"}, admin)

      assert flow.name == "test"

      assert_receive {:event, %PubSub.FlowCreated{item: ^flow}}
    end

    test "it can update an existing flow" do
      admin = admin_user()
      flow = insert(:flow)

      {:ok, upd} = Flows.upsert_flow(%{name: flow.name, description: "test description"}, admin)

      assert upd.id == flow.id
      assert upd.name == flow.name
      assert upd.description == "test description"

      assert_receive {:event, %PubSub.FlowUpdated{item: ^upd}}
    end

    test "project writers can upsert a flow" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, flow} = Flows.upsert_flow(%{name: "test", project_id: project.id}, user)

      assert flow.name == "test"
    end

    test "non-admins cannot upsert a flow" do
      {:error, _} = Flows.upsert_flow(%{name: "test"}, insert(:user))
    end
  end

  describe "delete_flow/2" do
    test "writers can delete a flow" do
      user = insert(:user)
      flow = insert(:flow, write_bindings: [%{user_id: user.id}])

      {:ok, del} = Flows.delete_flow(flow.id, user)

      assert del.id == flow.id

      refute refetch(flow)

      assert_receive {:event, %PubSub.FlowDeleted{item: ^del}}
    end

    test "non writers cannot delete" do
      user = insert(:user)
      flow = insert(:flow)

      {:error, _} = Flows.delete_flow(flow.id, user)
    end
  end
end
