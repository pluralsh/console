defmodule Console.Cost.Pr do
  import Console.Deployments.Policies
  import Console.AI.Evidence.Base, only: [prepend: 2, append: 2]
  import Console.Cost.Dimensions

  alias Console.AI.{Provider, Fixer, Tools.Pr}
  alias Console.Repo
  alias Console.Schema.{ClusterScalingRecommendation, Service, User}

  @pr """
  The following is the description of how a Kubernetes service is configured using Plural as a GitOps engine.  I want to reconfigure one
  of its containers resource requests to match an optimal setup determined by our cost management solution.  The manifests for
  the service will be listed for you fully.

  General guidelines to follow:
  - Use Markdown formatting (e.g., `inline code`, ```code fences```, lists, tables).
  - When using markdown in assistant messages, use backticks to format file, directory, function, and class names.
  """

  @pr_additional """
  The user wants you to create a PR with the given information, here are some basic PR creation guidelines:

  You must always provide the following information, which will be given to you and are necessary to create the PR:
  - The git repository url
  - The branch name
  - The commit message
  - The PR title
  - The PR body
  - The PR description

  Please spawn a Pull Request to fix the issue described above.  The code change should be the most direct
  and straightforward way to fix the issue described.  Change only the minimal amount of lines in the original files
  provided to successfully fix the issue, avoid any extraneous changes as they will potentially break additional
  functionality upon application.

  The necessary file updates will be easy to infer from the summary given
  """

  @spec suggestion(binary | ClusterScalingRecommendation.t, User.t) :: Fixer.resp
  def suggestion(%ClusterScalingRecommendation{} = rec, %User{} = user) do
    Console.AI.Tool.context(%{user: user})
    with %{service: %Service{} = svc} = rec <- Repo.preload(rec, [:service]),
         {:ok, svc} <- allow(svc, user, :write),
         {:ok, [_ | prompt]} <- Fixer.Service.prompt(svc, "") do
      prompt
      |> append({:user, cost_prompt(rec)})
      |> append({:user, "Be sure to explicitly state the Git repository and full file names that are needed to change, alongside the content of the files that need to be modified with enough surrounding context to understand what changed.  Also provide a git-style diff comparison for each changed file where possible."})
      |> Provider.completion(preface: @pr, client: :tool)
    end
  end

  def suggestion(id, %User{} = user) when is_binary(id) do
    Repo.get!(ClusterScalingRecommendation, id)
    |> suggestion(user)
  end

  @doc """
  Generates a prompt to apply a scaling recommendation and then executes a PR tool call.  Cannot be done w/o write access
  to the given service.
  """
  @spec create(binary | ClusterScalingRecommendation.t, User.t) :: Fixer.pr_resp
  def create(%ClusterScalingRecommendation{} = rec, %User{} = user) do
    Console.AI.Tool.context(%{user: user})
    with %{service: %Service{} = svc} = rec <- Repo.preload(rec, [:service]),
         {:ok, svc} <- allow(svc, user, :write),
         {:ok, [_ | prompt]} <- Fixer.Service.prompt(svc, "") do
      prepend(prompt, {:user, "#{@pr}\n\n#{@pr_additional}"})
      |> append({:user, cost_prompt(rec)})
      |> Provider.simple_tool_call(Pr)
      |> Fixer.handle_tool_call(%{service_id: svc.id}, user)
    end
  end

  def create(id, %User{} = user) when is_binary(id) do
    Repo.get!(ClusterScalingRecommendation, id)
    |> create(user)
  end

  defp cost_prompt(%ClusterScalingRecommendation{} = rec) do
    requests = Console.drop_nils(%{
                 memory: maybe_quote(memory(rec.memory_recommendation)),
                 cpu: maybe_quote(cpu(rec.cpu_recommendation))
               })
               |> Jason.encode!()

    """
    The cost management system has recommended this service have the following scaling recommendations applied, which I'll list in json format:

    ```json
    {
      "controller_type": "#{rec.type}",
      "namespace": "#{rec.namespace}",
      "name": "#{rec.name}",
      "container": "#{rec.container}",
      "requests": #{requests}
    }
    ```

    Please generate a PR that applies those changes to the above service manifests.
    """
  end
end
