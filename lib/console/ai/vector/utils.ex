defmodule Console.AI.Vector.Utils do
  alias Console.Deployments.Settings

  @spec initialized() :: :ok | Console.error
  def initialized() do
    case Settings.update(%{ai: %{vector_store: %{initialized: true}}}) do
      {:ok, _} -> :ok
      err -> err
    end
  end
end
