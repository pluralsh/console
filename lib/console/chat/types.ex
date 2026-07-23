defmodule Console.Chat.Reference do
  defstruct [:id, :text, :parent_id]
end

defmodule Console.Chat.Channel do
  defstruct [:id, :name]
end
