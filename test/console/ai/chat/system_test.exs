defmodule Console.AI.Chat.SystemTest do
  use Console.DataCase
  alias Console.AI.Chat.System

  describe "prompt/1" do
    test "it can generate a prompt for a service thread" do
      service = insert(:service)
      thread = insert(:chat_thread, service: service)
      prompt = System.prompt(thread)

      assert is_binary(prompt)
    end
  end
end
