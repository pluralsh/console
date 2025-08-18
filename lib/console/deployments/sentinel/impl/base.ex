defmodule Console.Deployments.Sentinel.Impl.Base do
  alias Console.AI.{Provider, Tools.Sentinel}

  @type status :: %{status: :success | :failed, reason: String.t}

  def post_status(pid, status) do
    send(pid, {:status, self(), status})
  end

  def prepend(l, msg), do: [msg | l]

  def user_msgs(l), do: Enum.map(l, & {:user, &1})

  @spec ai_call(Provider.history, String.t) :: {:ok, status} | :ignore | {:error, binary}
  def ai_call(history, preface) do
    Provider.tool_call(history, [Sentinel], preface: preface)
    |> case do
      {:ok, [%{sentinel_check: %{result: %Sentinel{passing: passing, reason: reason}}} | _]} ->
        {:ok, %{status: if(passing, do: :success, else: :failed), reason: reason}}
      {:ok, [%{sentinel_check: %{error: error}} | _]} ->
        {:error, "AI tool call failed: #{inspect(error)}"}
      _ -> :ignore
    end
  end
end
