defmodule Console.Chat.Impl do
  @moduledoc """
  A thin behaviour to define a chat provider implementation.
  """
  alias Console.Schema.ChatConnection
  alias Console.Chat.{Channel, Impl.Slack}

  defmacro __using__(_opts) do
    quote do
      @behaviour Console.Chat.Impl
      alias Console.Schema.ChatConnection
      require Logger
    end
  end

  @callback search_channels(ChatConnection.t(), binary) :: {:ok, [Channel.t()]} | Console.error()
  @callback child_spec(ChatConnection.t) :: DynamicSupervisor.child_spec()

  def child_spec(%ChatConnection{type: :slack} = conn), do: Slack.child_spec(conn)

  @spec search_channels(ChatConnection.t(), binary | nil) :: {:ok, [Channel.t()]} | Console.error()
  def search_channels(%ChatConnection{} = conn, query) do
    with {:ok, impl} <- provider(conn),
         do: impl.search_channels(conn, query)
  end

  defp provider(%ChatConnection{type: :slack}), do: {:ok, Slack}
  defp provider(%ChatConnection{type: type}), do: {:error, "#{type} chat search is not implemented"}
end
