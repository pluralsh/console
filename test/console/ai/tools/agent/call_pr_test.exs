defmodule Console.AI.Tools.Agent.CallPrTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.CallPr
  alias Console.Schema.Chat

  describe "implement/1" do
    test "it can fetch catalogs" do
      pr_automation = insert(:pr_automation)
      thread = insert(:chat_thread)

      {:ok, result} = CallPr.implement(%CallPr{
        pr_automation_id: pr_automation.id,
        context: Jason.encode!(%{"blah" => "blah"})
      })

      assert result.type == :pr_call
      assert result.pr_automation_id == pr_automation.id


      {:ok, res} =
        %Chat{thread_id: thread.id, user_id: thread.user_id, seq: 0}
        |> Chat.changeset(DeepMerge.deep_merge(%{
          role: :assistant,
          attributes: %{
            tool: %{
              call_id: "123",
              name: CallPr.name(),
              arguments: %{}
            }
          }
        }, result))
        |> Console.Repo.insert() # simulate saving in thread

      assert res.attributes.pr_call.context == %{"blah" => "blah"}
    end
  end
end
