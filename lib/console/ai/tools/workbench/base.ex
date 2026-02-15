defmodule Console.AI.Tools.Workbench.Base do
  defmacro __using__(_) do
    quote do
      use Ecto.Schema
      import Ecto.Changeset
    end
  end
end
