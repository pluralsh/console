defmodule Console.Deployments.Pr.Governance.ServiceNowTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Pr.Governance.Impl.ServiceNow
  alias Console.Schema.{ScmConnection, PullRequest}
  alias Console.AI.Provider

  describe "open/2" do
    test "it can create a new service now change and write a comment to the pr" do
      gov = governance()
      pr = insert(:pull_request, governance: gov, status: :open)

      expect(Console.ServiceNow.Client, :create_change, fn _, _, [chg_model: "Standard"] ->
        {:ok, %Console.ServiceNow.Change{sys_id: "1234567890", number: "CHG1234567890", state: -4}}
      end)

      expect(Console.Deployments.Pr.Dispatcher, :review, fn %ScmConnection{}, %PullRequest{}, _ ->
        {:ok, "1234567890"}
      end)

      expect(Provider, :simple_tool_call, fn _, Console.AI.Tools.ServiceNow, _ ->
        {:ok, %Console.AI.Tools.ServiceNow{
          short_description: "test",
          description: "test",
          implementation_plan: "test",
          backout_plan: "test",
          test_plan: "test"
        }}
      end)

      assert ServiceNow.open(gov, pr) == {:ok, %{
        "id" => "1234567890",
        "number" => "CHG1234567890",
        "state" => -4,
        "comment_id" => "1234567890"
      }}
    end
  end

  describe "#confirm/2" do
    test "it will query service now and progress the change to the implement state" do
      gov = governance()
      pr = insert(:pull_request,
        governance: gov,
        status: :open,
        governance_state: %{"id" => "1234567890", "state" => -2, "number" => "CHG1234567890", "comment_id" => "1234567890"}
      )

      expect(Console.ServiceNow.Client, :get_change, fn _, "1234567890" ->
        {:ok, %Console.ServiceNow.Change{state: -2, sys_id: "1234567890", number: "CHG1234567890"}}
      end)

      expect(Console.ServiceNow.Client, :update_change, fn _, "1234567890", %{state: -1} ->
        {:ok, %Console.ServiceNow.Change{state: -1, sys_id: "1234567890", number: "CHG1234567890"}}
      end)

      expect(Console.Deployments.Pr.Dispatcher, :review, fn %ScmConnection{}, %PullRequest{comment_id: "1234567890"}, _ ->
        {:ok, "1234567890"}
      end)

      assert ServiceNow.confirm(gov, pr) == {:ok, %{
        "id" => "1234567890",
        "number" => "CHG1234567890",
        "state" => -1,
        "comment_id" => "1234567890"
      }}
    end
  end

  describe "#close/2" do
    test "it will close the change with success if the pr is merged" do
      gov = governance()
      pr = insert(:pull_request,
        governance: gov,
        status: :merged,
        governance_state: %{"id" => "1234567890", "state" => -1, "number" => "CHG1234567890", "comment_id" => "1234567890"}
      )

      expect(Console.ServiceNow.Client, :update_change, fn _, "1234567890", %{state: 0} ->
        {:ok, %Console.ServiceNow.Change{state: 0, sys_id: "1234567890", number: "CHG1234567890"}}
      end)

      expect(Console.ServiceNow.Client, :update_change, fn _, "1234567890", %{state: 3, close_code: "successful", close_notes: "Pull request merged"} ->
        {:ok, %Console.ServiceNow.Change{state: 3, sys_id: "1234567890", number: "CHG1234567890"}}
      end)

      expect(Console.Deployments.Pr.Dispatcher, :review, fn %ScmConnection{}, %PullRequest{comment_id: "1234567890"}, _ ->
        {:ok, "1234567890"}
      end)

      assert ServiceNow.close(gov, pr) == {:ok, %{
        "id" => "1234567890",
        "number" => "CHG1234567890",
        "state" => 3,
        "comment_id" => "1234567890"
      }}
    end

    test "if the pr is closed, it will cancel the change" do
      gov = governance()
      pr = insert(:pull_request,
        governance: gov,
        status: :closed,
        governance_state: %{"id" => "1234567890", "state" => -1, "number" => "CHG1234567890", "comment_id" => "1234567890"}
      )

      expect(Console.ServiceNow.Client, :update_change, fn _, "1234567890", %{state: 4} ->
        {:ok, %Console.ServiceNow.Change{state: 4, sys_id: "1234567890", number: "CHG1234567890"}}
      end)

      expect(Console.Deployments.Pr.Dispatcher, :review, fn %ScmConnection{}, %PullRequest{comment_id: "1234567890"}, _ ->
        {:ok, "1234567890"}
      end)

      assert ServiceNow.close(gov, pr) == {:ok, %{
        "id" => "1234567890",
        "number" => "CHG1234567890",
        "state" => 4,
        "comment_id" => "1234567890"
      }}
    end
  end

  defp governance() do
    insert(:pr_governance,
      connection: insert(:scm_connection, type: :github),
      configuration: %{
        service_now: %{
          url: "https://service-now.url",
          username: "username",
          password: "password",
          change_model: "Standard"
        }
      }
    )
  end
end
