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

    test "writers can upsert server associations" do
      user = insert(:user)
      other = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}, %{user_id: other.id}])
      flow = insert(:flow, name: "test", project: project)
      server = insert(:mcp_server,  write_bindings: [%{user_id: user.id}])

      {:ok, f} = Flows.upsert_flow(%{
        name: "test",
        server_associations: [%{server_id: server.id}]
      }, user)

      assert f.id == flow.id
      assert f.name == "test"

      {:error, _} = Flows.upsert_flow(%{
        name: "test",
        server_associations: [%{server_id: server.id}]
      }, other)
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

  describe "upsert_mcp_server/2" do
    test "admins can create a mcp_server" do
      admin = admin_user()

      {:ok, mcp_server} = Flows.upsert_mcp_server(%{
        name: "test",
        url: "https://example.com"
      }, admin)

      assert mcp_server.name == "test"
    end

    test "it can update an existing mcp_server" do
      admin = admin_user()
      mcp_server = insert(:mcp_server)

      {:ok, upd} = Flows.upsert_mcp_server(%{
        name: mcp_server.name,
        url: "https://example.com"
      }, admin)

      assert upd.id == mcp_server.id
      assert upd.name == mcp_server.name
      assert upd.url == "https://example.com"
    end

    test "project writers can upsert a mcp_server" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, mcp_server} = Flows.upsert_mcp_server(%{
        name: "test",
        url: "https://example.com",
        project_id: project.id
      }, user)

      assert mcp_server.name == "test"
      assert mcp_server.url == "https://example.com"
    end

    test "non-admins cannot upsert a mcp server" do
      {:error, _} = Flows.upsert_mcp_server(%{name: "test", url: "https://example.com"}, insert(:user))
    end
  end

  describe "delete_mcp_server/2" do
    test "writers can delete a mcp_server" do
      user = insert(:user)
      mcp_server = insert(:mcp_server, write_bindings: [%{user_id: user.id}])

      {:ok, del} = Flows.delete_mcp_server(mcp_server.id, user)

      assert del.id == mcp_server.id

      refute refetch(mcp_server)
    end

    test "non writers cannot delete" do
      user = insert(:user)
      mcp_server = insert(:mcp_server)

      {:error, _} = Flows.delete_mcp_server(mcp_server.id, user)
    end
  end
end
