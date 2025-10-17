defmodule Console.Deployments.Sentinel.Impl.Base do
  alias Console.AI.{Provider, Tools.Sentinel}

  @type status :: %{status: :success | :failed, reason: String.t}

  def post_status(pid, status) do
    send(pid, {:status, self(), status})
  end

  def post_update(pid, status) do
    send(pid, {:update, self(), status})
  end

  def prepend(l, msg), do: [msg | l]

  def append(l, msg), do: l ++ [msg]

  def user_msgs(l), do: Enum.map(l, & {:user, &1})

  @spec ai_call(Provider.history, String.t) :: {:ok, status} | :ignore | {:error, binary}
  def ai_call(history, preface) do
    case Provider.simple_tool_call(history, Sentinel, preface: preface) do
      {:ok, %Sentinel{passing: passing, reason: reason}} ->
        {:ok, %{status: if(passing, do: :success, else: :failed), reason: reason}}
      err -> err
    end
  end
end
