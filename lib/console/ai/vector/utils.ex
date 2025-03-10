defmodule Console.AI.Vector.Utils do
  alias Console.Deployments.Settings

  @spec initialized() :: :ok | Console.error
  def initialized() do
    case Settings.vector_store_initialized() do
      {:ok, _} -> :ok
      err -> err
    end
  end
end
