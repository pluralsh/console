defmodule Console.Alertmanager.Sink do
  @callback name() :: atom

  @callback handle_alert(%Alertmanager.Alert{}) :: {:ok, term} | {:error, term} | :ok
end
