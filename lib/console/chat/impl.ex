defmodule Console.Chat.Impl do
  @moduledoc """
  A thin behaviour to define a chat provider implementation.
  """
  alias Console.Schema.ChatConnection

  defmacro __using__(_opts) do
    quote do
      @behaviour Console.Chat.Impl
      alias Console.Schema.ChatConnection
      require Logger
    end
  end

  @callback child_spec(ChatConnection.t) :: DynamicSupervisor.child_spec()
end
