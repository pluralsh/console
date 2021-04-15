defmodule Watchman.Plural.Base do
  defmacro __using__(_) do
    quote do
      import Watchman.Plural.Base
      import Watchman.Plural.Queries
      alias Watchman.Plural.Client
    end
  end

  def prune_variables(map) do
    Enum.filter(map, fn {_, v} -> not is_nil(v) end)
    |> Enum.into(%{})
  end
end
