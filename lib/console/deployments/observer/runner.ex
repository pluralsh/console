defmodule Console.Deployments.Observer.Runner do
  alias Console.Repo
  alias Console.Schema.Observer
  alias Console.Deployments.Observer.{Poller, Action}

  require Logger

  def run(%Observer{} = observer) do
    observer = Repo.preload(observer, [:errors])
    {:ok, observer} = mark(observer)
    with {:poll, {:ok, val, attrs}} <- {:poll, Poller.poll(observer)},
         {:act, {:ok, attrs}} <- {:act, actions(observer, val, attrs)} do
      finish(observer, val, attrs)
    else
      {:poll, {:error, err}} -> add_error(observer, "poll", err)
      {:poll, :ignore} -> safe(observer)
      {:act, {:error, err}} -> add_error(observer, "action", err)
      err ->
        Logger.error "unknown observer error: #{inspect(err)}"
    end
  end

  defp actions(%Observer{actions: [_ | _] = actions} = obs, value, attrs) do
    Enum.reduce_while(actions, %{}, fn act, acc ->
      case Action.act(obs, act, value, attrs) do
        {:ok, {:keep, attrs}} -> {:cont, Map.merge(acc, attrs)}
        {:ok, _} -> {:cont, acc}
        err -> {:halt, err}
      end
    end)
    |> case do
      %{} = attrs -> {:ok, attrs}
      err -> err
    end
  end
  defp actions(_, _, _), do: {:ok, %{}}

  defp mark(%Observer{} = observer) do
    Observer.changeset(observer, %{last_run_at: Timex.now()})
    |> Repo.update()
  end

  defp finish(%Observer{} = observer, val, attrs) do
    Observer.changeset(observer, Map.merge(attrs, %{errors: [], last_value: val}))
    |> Repo.update()
  end

  def safe(%Observer{} = observer) do
    Observer.changeset(observer, %{errors: []})
    |> Repo.update()
  end

  defp add_error(%Observer{} = observer, source, err) do
    Observer.changeset(observer, %{errors: [%{source: source, message: "observer error: #{handle_error(err)}"}]})
    |> Repo.update()
  end

  defp handle_error(%Console.Commands.Tee{stdo: lines}) when is_list(lines), do: IO.iodata_to_binary(lines)
  defp handle_error(err), do: inspect(err)
end
