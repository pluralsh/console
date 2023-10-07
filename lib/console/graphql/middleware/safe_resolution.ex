defmodule Console.Middleware.SafeResolution do
  alias Absinthe.Resolution
  require Logger

  @behaviour Absinthe.Middleware


  # Replacement Helper
  # ------------------

  @doc """
  Call this on existing middleware to replace instances of
  `Resolution` middleware with `SafeResolution`
  """
  @spec apply(list()) :: list()
  def apply(middleware) when is_list(middleware) do
    Enum.map(middleware, fn
      {{Resolution, :call}, resolver} -> {__MODULE__, resolver}
      other -> other
    end)
  end


  # Middleware Callbacks
  # --------------------

  @impl true
  def call(resolution, resolver) do
    Resolution.call(resolution, resolver)
  rescue
    exception ->
      {_, msg} = Console.GraphQl.Exception.error(exception)
      error = Exception.format(:error, exception, __STACKTRACE__)
      Logger.error(error)
      Resolution.put_result(resolution, {:error, msg})
  end
end
