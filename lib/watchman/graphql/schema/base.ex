defmodule Watchman.GraphQl.Schema.Base do
  use Absinthe.Schema.Notation

  enum :delta do
    value :create
    value :update
    value :delete
  end

  enum :direction do
    value :before
    value :after
  end

  defmacro __using__(_) do
    quote do
      use Absinthe.Schema.Notation
      use Absinthe.Relay.Schema.Notation, :modern
      import Absinthe.Resolution.Helpers
      import Watchman.GraphQl.Schema.Base
    end
  end

  defmacro timestamps() do
    quote do
      field :inserted_at, :datetime
      field :updated_at, :datetime
    end
  end

  defmacro delta(type) do
    delta_type = :"#{type}_delta"
    quote do
      object unquote(delta_type) do
        field :delta, :delta
        field :payload, unquote(type)
      end
    end
  end

  defmacro ecto_enum(name, module) do
    module = Macro.expand(module, __CALLER__)
    values = module.__enum_map__()
             |> Enum.map(fn {key, _} ->
                quote do
                  value unquote(key)
                end
             end)
    quote do
      enum unquote(name) do
        unquote(values)
      end
    end
  end
end