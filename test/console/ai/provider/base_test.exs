defmodule Console.AI.Provider.BaseTest do
  use ExUnit.Case, async: true
  alias Console.AI.Provider.Base

  describe "reqllm_messages/1" do
    test "it json encodes non-string tool results like sql rows" do
      row = ["plrl-dev", "gp2", 10, 100, nil]

      %ReqLLM.Context{messages: [%ReqLLM.Message{role: :tool, content: [part]}]} =
        Base.reqllm_messages([{:tool, [row]}])

      assert Jason.decode!(part.text) == [row]
    end
  end
end
