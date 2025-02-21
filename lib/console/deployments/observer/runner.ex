defmodule Console.Deployments.Observer.Runner do
  alias Console.Repo
  alias Console.Schema.Observer
  alias Console.Deployments.Observer.{Poller, Action}

  require Logger

  def run(%Observer{} = observer) do
    observer = Repo.preload(observer, [:errors])
    {:ok, observer} = mark(observer)
    with {:poll, {:ok, val}} <- {:poll, Poller.poll(observer)},
         {:act, {:ok, _}} <- {:act, actions(observer, val)} do
      finish(observer, val)
    else
      {:poll, {:error, err}} -> add_error(observer, "poll", err)
      {:poll, :ignore} -> {:ok, observer}
      {:act, {:error, err}} -> add_error(observer, "action", err)
      err ->
        Logger.error "unknown observer error: #{inspect(err)}"
    end
  end

  defp actions(%Observer{actions: [_ | _] = actions} = obs, value) do
    Enum.reduce_while(actions, {:ok, nil}, fn act, _ ->
      case Action.act(obs, act, value) do
        {:ok, _} = res -> {:cont, res}
        err -> {:halt, err}
      end
    end)
  end
  defp actions(_, _), do: {:ok, nil}

  defp mark(%Observer{} = observer) do
    Observer.changeset(observer, %{last_run_at: Timex.now()})
    |> Repo.update()
  end

  defp finish(%Observer{} = observer, val) do
    Observer.changeset(observer, %{errors: [], last_value: val})
    |> Repo.update()
  end

  defp add_error(%Observer{} = observer, source, err) do
    Observer.changeset(observer, %{errors: [%{source: source, message: "observer error: #{inspect(err)}"}]})
    |> Repo.update()
  end
end
