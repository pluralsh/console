defmodule Console.AI.Tools.Workbench.Base do
  defmacro __using__(_) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset
      import Console.AI.Tools.Workbench.Base
    end
  end

  defguard nonempty_string(str) when is_binary(str) and byte_size(str) > 0
end
