defmodule Mix.Tasks.Agent.Chart do
  use Mix.Task
  alias Console.Deployments.Settings

  @deps ~w(logger req)a

  def run(_) do
    Enum.each(@deps, &Application.ensure_all_started/1)
    Logger.configure(level: :error)

    file = Settings.agent_chart()

    Settings.agent_vsn()
    |> String.trim_leading("v")
    |> agent_chart_url()
    |> Req.get!(into: File.stream!(file))
  end

  defp agent_chart_url(vsn),
    do: "https://github.com/pluralsh/deployment-operator/releases/download/agent-v#{vsn}/deployment-operator-#{vsn}.tgz"
end
