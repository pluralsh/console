defmodule Console.Middleware.SafeResolution do
  alias Absinthe.Resolution
  alias Console.Middleware.ErrorHandler
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

  @doc """
  Hardens every field with a custom resolver (root or nested) so raised exceptions, exits and
  unformattable error tuples (eg failed KAS requests) become graphql errors instead of a 500.
  Default field lookups are left untouched (absinthe never routes builtin introspection fields here).

  Fields with anonymous resolvers can't be inlined at compile time, so absinthe re-runs `middleware/3`
  on every resolution of them; keep this a single cheap pass.
  """
  @spec wrap(list(), map()) :: list()
  def wrap([{{Resolution, :call}, resolver}], _), do: [{__MODULE__, resolver}, ErrorHandler]
  def wrap(middleware, _) when is_list(middleware), do: harden(middleware, middleware, [], false, false)
  def wrap(middleware, _), do: middleware

  defp harden([{{Resolution, :call}, r} | rest], orig, acc, _, handled?),
    do: harden(rest, orig, [{__MODULE__, r} | acc], true, handled?)
  defp harden([ErrorHandler | rest], orig, acc, resolves?, _),
    do: harden(rest, orig, [ErrorHandler | acc], resolves?, true)
  defp harden([{ErrorHandler, _} = h | rest], orig, acc, resolves?, _),
    do: harden(rest, orig, [h | acc], resolves?, true)
  defp harden([h | rest], orig, acc, resolves?, handled?),
    do: harden(rest, orig, [h | acc], resolves?, handled?)
  defp harden([], orig, _, false, _), do: orig
  defp harden([], _, acc, true, true), do: :lists.reverse(acc)
  defp harden([], _, acc, true, false), do: :lists.reverse(acc, [ErrorHandler])


  # Middleware Callbacks
  # --------------------

  @impl true
  def call(resolution, resolver) do
    Resolution.call(resolution, resolver)
  rescue
    exception ->
      {code, msg} = Console.GraphQl.Exception.error(exception)
      report(exception, code, msg, __STACKTRACE__)
      Resolution.put_result(resolution, {:error, msg})
  catch
    :exit, {:timeout, _} ->
      Logger.warning("graphql resolver timed out")
      Resolution.put_result(resolution, {:error, failure_message(:exit, {:timeout, nil})})
    kind, reason when kind in [:exit, :throw] ->
      Logger.error(Exception.format(kind, reason, __STACKTRACE__))
      Resolution.put_result(resolution, {:error, failure_message(kind, reason)})
  end

  @doc "Upstream (KAS/http) failures are routine and shouldn't page sentry or dump stacktraces"
  @spec upstream?(term) :: boolean
  def upstream?(%Kazan.RemoteError{}), do: true
  def upstream?(%HTTPoison.Error{}), do: true
  def upstream?(_), do: false

  defp report(exception, code, msg, stacktrace) do
    case upstream?(exception) do
      true -> Logger.warning("graphql resolver upstream failure: #{msg}")
      false ->
        Sentry.capture_exception(exception, stacktrace: stacktrace)
        if code >= 500, do: Logger.error(Exception.format(:error, exception, stacktrace))
    end
  end

  defp failure_message(:exit, {:timeout, _}), do: "request timed out"
  defp failure_message(:exit, _), do: "request failed unexpectedly (check the logs for more details)"
  defp failure_message(:throw, _), do: "unknown error (check the logs for more details)"
end
