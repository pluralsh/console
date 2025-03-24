defmodule Console.Cost.Pr do
  import Console.Deployments.Policies
  import Console.AI.Evidence.Base, only: [prepend: 2, append: 2]
  import Console.Cost.Dimensions

  alias Console.AI.{Provider, Fixer, Tools.Pr}
  alias Console.Repo
  alias Console.Schema.{ClusterScalingRecommendation, Service, User}

  @pr """
  The following is the description of how a Kubernetes service is configured using Plural as a CD engine.  I want to reconfigure one
  of its containers resource requests to match an optimal setup determined by our cost management solution.  First, the manifests for
  the service are listed below:
  """

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
      prepend(prompt, {:user, @pr})
      |> append({:user, cost_prompt(rec)})
      |> Provider.tool_call([Pr])
      |> Fixer.handle_tool_call(%{service_id: svc.id})
    end
  end

  def create(id, %User{} = user) when is_binary(id) do
    Repo.get!(ClusterScalingRecommendation, id)
    |> create(user)
  end

  defp cost_prompt(%ClusterScalingRecommendation{} = rec) do
    """
    The cost management system has recommended this service have the following scaling recommendations applied, which I'll list in json format:

    ```json
    {
      "controller_type": "#{rec.type}",
      "namespace": "#{rec.namespace}",
      "name": "#{rec.name}",
      "container": "#{rec.container}",
      "requests": {
        "memory": #{maybe_quote(memory(rec.memory_recommendation))},
        "cpu": #{maybe_quote(cpu(rec.cpu_recommendation))}
      }
    }
    ```

    Please generate a PR that applies those changes to the above service manifests.
    """
  end
end
