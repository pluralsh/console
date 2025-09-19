defmodule Console.Sentry do
  def filter_non_500(%Sentry.Event{original_exception: exception} = event) do
    cond do
      Plug.Exception.status(exception) < 500 -> nil

      # Fall back to the default event filter.
      Sentry.DefaultEventFilter.exclude_exception?(exception, event.source) -> nil

      true -> event
    end
  end
end
