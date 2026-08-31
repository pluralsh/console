defmodule Console.Retrier do
  require Logger

  defstruct [:res, :retry_if, :max_pause, retry: 0, max: 3, pause: 100, backoff: 1]

  def new(opts) do
    __MODULE__
    |> struct(opts)
    |> then(fn
      %__MODULE__{retry_if: nil} = retrier -> %{retrier | retry_if: &retryable?/1}
      retrier -> retrier
    end)
  end

  def retry(fun, opts \\ []), do: do_retry(new(opts), fun)

  defp do_retry(%__MODULE__{max: r, retry: r, res: res}, _), do: res
  defp do_retry(%__MODULE__{retry: r} = retrier, fun) do
    if r > 0 do
      pause = pause(retrier, r)
      :timer.sleep(cap_pause(retrier, pause + jitter(pause)))
    end

    try do
      fun.()
      |> maybe_retry(retrier, fun)
    rescue
      err ->
        Logger.error(Exception.format(:error, err, __STACKTRACE__))
        maybe_retry({:error, {:exception, err}}, retrier, fun)
    catch
      reason, err ->
        Logger.error(Exception.format(:error, err, __STACKTRACE__))
        maybe_retry({:error, {:exception, {reason, err}}}, retrier, fun)
    end
  end

  defp maybe_retry(res, %__MODULE__{retry: retry, retry_if: retry_if} = retrier, fun) do
    case retry_if.(res) do
      true -> do_retry(%{retrier | retry: retry + 1, res: res}, fun)
      _ -> res
    end
  end

  defp pause(%__MODULE__{pause: pause, backoff: backoff}, retry),
    do: round(pause * :math.pow(backoff, retry - 1))

  defp cap_pause(%__MODULE__{max_pause: max_pause}, pause) when is_integer(max_pause),
    do: min(pause, max_pause)
  defp cap_pause(_, pause), do: pause

  defp retryable?({:error, _}), do: true
  defp retryable?(:error), do: true
  defp retryable?(_), do: false

  defp jitter(pause) when pause >= 4,
    do: :rand.uniform(floor(pause / 2)) - floor(pause / 4)
  defp jitter(_), do: 0
end
