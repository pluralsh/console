defmodule Console.AI.Agents.Terraform do
  use Console.AI.Agents.Base

  def handle_cast({:enqueue, _}, session), do: {:noreply, session}

  def handle_continue(:boot, session) do
    {:noreply, session}
  end
end
