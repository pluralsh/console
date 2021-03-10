defmodule Watchman.Watchers.GraphQl do
  use Watchman.Watchers.Base

  def handle_info(:start, state) do
    Logger.info "starting graphql watcher"
    # Watchman.Forge.Subscription.subscribe()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
