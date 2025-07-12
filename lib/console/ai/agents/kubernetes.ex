defmodule Console.AI.Agents.Kubernetes do
  use Console.AI.Agents.Base

  def handle_cast(_, state) do
    Logger.info "ignoring event in kubernetes agent"
    {:noreply, state}
  end
end
