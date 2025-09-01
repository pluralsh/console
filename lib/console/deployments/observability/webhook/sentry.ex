defmodule Console.Deployments.Observability.Webhook.Sentry do
  @behaviour Console.Deployments.Observability.Webhook
  import Console.Deployments.Observability.Webhook.Base

  def associations(:flow, %{"plrl.flow" => name}, acc),
    do: Map.put(acc, :flow_id, flow(name))
  def associations(_, _, acc), do: acc

  def fingerprint(%{"event" => %{"issue_id" => id}}), do: id
  def fingerprint(_), do: nil

  def summary(%{"event" => %{"title" => title}} = payload) do
    with %{} = stacktrace <- stacktrace(payload) do
      """
      #{title}
      #{stacktrace.type}: #{stacktrace.value}
      #{Enum.map_join(stacktrace.frames, "\n", fn frame ->
        """
        - location: #{frame.file}:#{frame.line}:#{frame.column} #{frame.function}
          context: #{frame.context_line}
          variables: #{maybe_vars(frame.vars)}
        """
      end)}
      """
    else
      _ -> nil
    end
  end
  def summary(_), do: nil

  def stacktrace(%{"event" => %{"exception" => %{"values" => [%{"stacktrace" => stacktrace} | _]}}}) do
    %{
      type: stacktrace["type"],
      value: stacktrace["value"],
      frames: Enum.map(stacktrace["frames"] || [], fn frame ->
        %{
          file: frame["filename"],
          line: frame["lineno"],
          column: frame["colno"],
          function: frame["function"],
          context_line: frame["context_line"],
          vars: frame["vars"],
        }
      end)
    }
  end
  def stacktrace(_), do: nil

  def state(_), do: :firing

  def severity(_), do: :high

  defp maybe_vars(%{"vars" => %{} = vars}) do
    case Jason.encode(vars) do
      {:ok, json} -> json
      _ -> "No variables available"
    end
  end
  defp maybe_vars(_), do: "No variables available"
end
