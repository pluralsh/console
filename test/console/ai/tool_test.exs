defmodule Console.AI.ToolTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool

  defmodule ProtectedTool do
    def name, do: :protected_tool
  end

  defmodule ApprovalTool do
    defstruct [:approval]

    def name(_), do: "protected_tool"
  end

  describe "policy/3" do
    test "allows tool input when its matching policy succeeds" do
      assert {:ok, ProtectedTool} =
               Tool.policy(ProtectedTool, %{"blocked" => false}, [
                 policy("^protected_tool$")
               ])
    end

    test "rejects tool input when its matching policy denies it" do
      assert {:error, message} =
               Tool.policy(ProtectedTool, %{"blocked" => true}, [
                 policy("^protected_tool$")
               ])

      assert message =~ "Policy denied"
    end

    test "does not apply policies that do not match the tool name" do
      assert {:ok, ProtectedTool} =
               Tool.policy(ProtectedTool, %{"blocked" => true}, [
                 policy("^other_tool$")
               ])
    end

    test "includes the current actor in policy input" do
      Tool.context(user: build(:user, email: "blocked@example.com", groups: [build(:group, name: "operators")]))

      assert {:error, message} =
               Tool.policy(ProtectedTool, %{}, [
                 actor_policy("^protected_tool$")
               ])

      assert message =~ "Policy denied"
    end

    test "attaches automatic approval to the tool returned by policy validation" do
      assert {:ok, %ApprovalTool{approval: %Tool.Approval{reason: reason}}} =
               Tool.policy(%ApprovalTool{}, %{}, [
                 approval_policy("^protected_tool$")
               ])

      assert reason =~ "safe operation"
    end

    test "leaves approval unset when no policy matches" do
      assert {:ok, %ApprovalTool{approval: nil}} =
               Tool.policy(%ApprovalTool{}, %{}, [approval_policy("^other_tool$")])
    end
  end

  defp policy(regex) do
    %Tool.Policy{
      regexes: [Regex.compile!(regex)],
      name: "deny-blocked-input",
      policy_id: Ecto.UUID.generate(),
      policy: """
      package plrl.wb.admission

      sample := 0

      deny[{"message": "blocked"}] if {
        input.tool_name == "protected_tool"
        input.tool.blocked == true
      }
      """
    }
  end

  defp actor_policy(regex) do
    %Tool.Policy{
      regexes: [Regex.compile!(regex)],
      name: "deny-blocked-actor",
      policy_id: Ecto.UUID.generate(),
      policy: """
      package plrl.wb.admission

      sample := 0

      deny[{"message": "actor is blocked"}] if {
        input.actor.email == "blocked@example.com"
      }
      """
    }
  end

  defp approval_policy(regex) do
    %Tool.Policy{
      regexes: [Regex.compile!(regex)],
      name: "auto-approve",
      policy_id: Ecto.UUID.generate(),
      policy: """
      package plrl.wb.admission

      sample := 0

      approve[{"reason": "safe operation"}] if {
        true
      }
      """
    }
  end
end
