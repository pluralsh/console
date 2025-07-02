defmodule Console.Schema.Base do
  import Ecto.Changeset
  @moduledoc false

  defmacro __using__(_) do
    quote do
      use Piazza.Ecto.Schema
      import Console.Schema.Base
    end
  end

  def immutable(cs, fields) do
    Enum.reduce(fields, cs, fn field, cs ->
      case {cs, get_change(cs, field)} do
        {cs, nil} -> cs
        {%Ecto.Changeset{data: %{^field => val}}, _} when not is_nil(val) ->
          add_error(cs, field, "cannot be changed")
        {cs, _} -> cs
      end
    end)
  end
end
