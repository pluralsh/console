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

    root_service_chart(file)
  end

  defp agent_chart_url(vsn),
    do: "https://github.com/pluralsh/deployment-operator/releases/download/agent-v#{vsn}/deployment-operator-#{vsn}.tgz"

  defp root_service_chart(file) do
    with {:ok, contents} <- :erl_tar.extract(to_charlist(file), [:compressed, :memory]) do
      contents =
        Enum.flat_map(contents, fn {path, contents} ->
          case Path.split(to_string(path)) do
            [_root | path] -> [{to_charlist(Path.join(path)), contents}]
            _ -> []
          end
        end)

      Settings.agent_service_chart()
      |> to_charlist()
      |> :erl_tar.create(contents, [:compressed])
    end
  end
end
