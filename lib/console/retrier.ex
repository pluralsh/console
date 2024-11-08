defmodule Console.Retrier do
  require Logger

  defstruct [:res, retry: 0, max: 3, pause: 100]

  def new(opts), do: struct(__MODULE__, opts)

  def retry(fun, opts \\ []), do: do_retry(new(opts), fun)

  defp do_retry(%__MODULE__{max: r, retry: r, res: res}, _), do: res
  defp do_retry(%__MODULE__{retry: r, pause: p} = retrier, fun) do
    if r > 0 do
      :timer.sleep(p + jitter(p))
    end

    try do
      case fun.() do
        {:error, _} = res -> do_retry(%{retrier | retry: r + 1, res: res}, fun)
        :error -> do_retry(%{retrier | retry: r + 1, res: :error}, fun)
        res -> res
      end
    rescue
      err ->
        Logger.error(Exception.format(:error, err, __STACKTRACE__))
        do_retry(%{retrier | retry: r + 1, res: {:error, {:exception, err}}}, fun)
    end
  end

  defp jitter(pause), do: :rand.uniform(floor(pause / 2)) - floor(pause / 4)
end
