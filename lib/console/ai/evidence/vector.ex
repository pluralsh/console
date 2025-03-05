defmodule Console.AI.Evidence.Vector do
  alias Console.AI.{
    Provider,
    VectorStore,
    Tools.Vector,
    Evidence.Context
  }

  require Logger

  @preface """
  The following is a description of the evidence for troubleshooting a kubernetes related issue.  Determine whether
  we should search an external vector store for additional context, containing information like historical PRs and
  alert information (including postmortems). This is normally not needed for base yaml misconfigurations, but
  can be needed for things like crash loops, OOM errors or other errors that can only be caused by software running in a
  container.
  """

  @spec with_vector_data(Provider.history | Context.t) :: Context.t
  def with_vector_data(history) do
    ctx = Context.new(history)
    with true <- VectorStore.enabled?(),
         {:ok, %Vector{query: query}} <- use_vector(ctx.history),
         {:ok, [_ | _] = vdata} <- VectorStore.fetch(query) do
      Context.prompt(ctx, {:user, "I've also found some relevent data that could add additional context to what caused the issue in rough order of relevance:"})
      |> Context.reduce(vdata, &Context.prompt(&2, {:user, vector_prompt(&1)}))
      |> Context.evidence(vector_evidence(vdata))
    else
      _ ->
        Logger.debug "skipping vector store extraction"
        Context.new(history)
    end
  end

  defp vector_prompt(%VectorStore.Response{type: :alert, alert_resolution: res}) do
    """
    A prior alert resolution with data like so that likely was caused by the same issue, with information below:

    Metadata:
      Title: #{res.title}
      Message: #{res.message}
      Severity: #{res.severity}

    And the logged resolution was:

    #{res.resolution}
    """
  end

  defp vector_prompt(%VectorStore.Response{type: :pr, pr_file: pr_file}) do
    """
    A file from a given pull request with information like so, containing a possible code change that caused the issue, described below:

    Pull Request URL: #{pr_file.url}
    Repo: #{pr_file.repo}
    PR Title: #{pr_file.title}
    Commit SHA: #{pr_file.sha}
    Filename: #{pr_file.filename}

    The full contents of the file is:

    ```
    #{pr_file.contents}
    ```

    The git patch of the change is:

    ```
    #{pr_file.patch}
    ```
    """
  end
  defp vector_prompt(_), do: nil

  defp vector_evidence(vdata) do
    Enum.map(vdata, fn
      %VectorStore.Response{pr_file: pr_file} -> %{pull_request: Map.from_struct(pr_file), type: :pr}
      %VectorStore.Response{alert_resolution: res}  -> %{alert_resolution: Map.from_struct(res), type: :alert}
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  defp use_vector(history) do
    case Provider.tool_call(history, [Vector], preface: @preface) do
      {:ok, [%{vector: %{result: %Vector{required: true} = vector}} | _]} ->
        {:ok, vector}
      _ -> false
    end
  end
end
