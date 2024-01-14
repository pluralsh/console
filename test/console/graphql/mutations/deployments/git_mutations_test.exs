defmodule Console.GraphQl.Deployments.GitMutationsTest do
  use Console.DataCase, async: true
  use Mimic

  describe "createScmConnection" do
    test "it will create a new scm connection" do
      {:ok, %{data: %{"createScmConnection" => scm}}} = run_query("""
        mutation Create($attrs: ScmConnectionAttributes!) {
          createScmConnection(attributes: $attrs) {
            id
            type
            name
          }
        }
      """, %{"attrs" => %{
        "type" => "GITHUB",
        "name" => "test",
        "token" => "my-pat"
      }}, %{current_user: admin_user()})

      assert scm["type"] == "GITHUB"
      assert scm["name"] == "test"
    end
  end

  describe "updateScmConnection" do
    test "it will create a new scm connection" do
      conn = insert(:scm_connection)
      {:ok, %{data: %{"updateScmConnection" => scm}}} = run_query("""
        mutation Create($id: ID!, $attrs: ScmConnectionAttributes!) {
          updateScmConnection(id: $id, attributes: $attrs) {
            id
            type
            name
          }
        }
      """, %{"attrs" => %{
        "type" => "GITHUB",
        "name" => "test",
        "token" => "my-pat"
      }, "id" => conn.id}, %{current_user: admin_user()})

      assert scm["id"] == conn.id
      assert scm["type"] == "GITHUB"
      assert scm["name"] == "test"
    end
  end

  describe "deleteScmConnection" do
    test "it will create a new scm connection" do
      conn = insert(:scm_connection)
      {:ok, %{data: %{"deleteScmConnection" => scm}}} = run_query("""
        mutation Create($id: ID!) {
          deleteScmConnection(id: $id) {
            id
            type
            name
          }
        }
      """, %{"id" => conn.id}, %{current_user: admin_user()})

      assert scm["id"] == conn.id
      refute refetch(conn)
    end
  end

  describe "createPrAutomation" do
    test "it will create a new scm connection" do
      conn = insert(:scm_connection)
      {:ok, %{data: %{"createPrAutomation" => pr}}} = run_query("""
        mutation Create($attrs: PrAutomationAttributes!) {
          createPrAutomation(attributes: $attrs) {
            id
            name
            message
            connection { id }
          }
        }
      """, %{"attrs" => %{
        "name" => "test",
        "message" => "some pr message",
        "connectionId" => conn.id,
      }}, %{current_user: admin_user()})

      assert pr["name"] == "test"
      assert pr["message"] == "some pr message"
      assert pr["connection"]["id"] == conn.id
    end
  end

  describe "updatePrAutomation" do
    test "it will create a new scm connection" do
      pr = insert(:pr_automation)
      {:ok, %{data: %{"updatePrAutomation" => updated}}} = run_query("""
        mutation Create($id: ID!, $attrs: PrAutomationAttributes!) {
          updatePrAutomation(id: $id, attributes: $attrs) {
            id
            name
          }
        }
      """, %{"attrs" => %{"name" => "test"}, "id" => pr.id}, %{current_user: admin_user()})

      assert updated["id"] == pr.id
      assert updated["name"] == "test"
    end
  end

  describe "deletePrAutomation" do
    test "it will create a new scm connection" do
      pr = insert(:pr_automation)
      {:ok, %{data: %{"deletePrAutomation" => deleted}}} = run_query("""
        mutation Create($id: ID!) {
          deletePrAutomation(id: $id) {
            id
            name
          }
        }
      """, %{"id" => pr.id}, %{current_user: admin_user()})

      assert deleted["id"] == pr.id
      refute refetch(pr)
    end
  end
end
