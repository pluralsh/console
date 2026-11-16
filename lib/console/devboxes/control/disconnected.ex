defmodule Console.Devboxes.Control.Disconnected do
  @moduledoc """
  The default `Console.Devboxes.Control`, used until the `devbox.v1.Control` gRPC client is configured.
  """
  @behaviour Console.Devboxes.Control

  for {name, arity} <- Console.Devboxes.Control.callbacks() do
    args = Macro.generate_arguments(arity, __MODULE__) |> Enum.map(fn {n, m, c} -> {:"_#{n}", m, c} end)
    @impl true
    def unquote(name)(unquote_splicing(args)), do: {:error, :not_connected}
  end
end
