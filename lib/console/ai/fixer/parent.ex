defmodule Console.AI.Fixer.Parent do
  use Console.AI.Evidence.Base
  import Console.AI.Fixer.Base
  alias Console.AI.Fixer.Service, as: SvcFixer
  alias Console.Deployments.{Services}
  alias Console.Schema.Service

  def parent_prompt(%Service{} = svc, info) do
    svc = Console.Repo.preload(svc, [:cluster, :repository, :parent])
    with {:ok, f} <- Services.tarstream(svc),
         {:ok, code} <- code_prompt(f) do
      [
        {:user, """
        The #{info[:child]} is being instantiated using a Plural service-of-services structure, and will be represented as a #{info[:cr]} kubernetes
        custom resource#{info[:cr_additional] || ""}.  It is possible this is where the fix needs to happen, especially in the wiring of helm values or
        terraform variables.

        I will do my best to describe the service itself and show you the manifests that's sourcing that service below:
        """},
        {:user, SvcFixer.svc_details(svc)} | code
      ]
    else
      _ -> []
    end
  end
  def parent_prompt(_, _), do: []
end
