defmodule ConsoleWeb.Sentry do
  alias Sentry.PlugContext

  def scrub_params(conn) do
    # just scrub all graphql variables for safety
    conn
    |> PlugContext.default_body_scrubber()
    |> Map.drop(~w(variables))
  end
end
