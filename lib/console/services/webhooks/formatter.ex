defmodule Console.Webhooks.Formatter do
  alias Console.Schema.Build
  @callback format(struct) :: {:ok, map} | :error

  defmacro __using__(_) do
    quote do
      @behaviour Console.Webhooks.Formatter
      import Console.Webhooks.Formatter
      alias Console.Webhooks.Formatter
      alias Console.Schema.Build
    end
  end

  def build_url(id), do: "https://#{Console.conf(:url)}/build/#{id}"

  def color(:successful), do: "#007a5a"
  def color(:failed), do: "#CC4400"

  def text(%Build{repository: repo, status: status}),
    do: "#{status_modifier(status)} #{repo}"

  def status_modifier(:successful), do: "Successfully deployed"
  def status_modifier(:failed), do: "Failed to deploy"
end
