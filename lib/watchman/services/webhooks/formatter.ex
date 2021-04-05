defmodule Watchman.Webhooks.Formatter do
  alias Watchman.Schema.Build
  @callback format(struct) :: {:ok, map} | :error

  defmacro __using__(_) do
    quote do
      @behaviour Watchman.Webhooks.Formatter
      import Watchman.Webhooks.Formatter
      alias Watchman.Webhooks.Formatter
      alias Watchman.Schema.Build
    end
  end

  def build_url(id), do: "https://#{Watchman.conf(:url)}/build/#{id}"

  def color(:successful), do: "#007a5a"
  def color(:failed), do: "#CC4400"

  def text(%Build{repository: repo, status: status}),
    do: "#{status_modifier(status)} #{repo}"

  def status_modifier(:successful), do: "Successfully deployed"
  def status_modifier(:failed), do: "Failed to deploy"
end
