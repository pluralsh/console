defmodule Console.AI.Research do
  use Console.Services.Base
  alias Console.Schema.{InfraResearch, User}
  alias Console.AI.{Provider, Tools.Agent.FixDiagram}
  alias Console.PubSub

  @preface """
  You're an experienced user of mermaid.js diagram format being asked to fix some slightly incorrect mermaid code.  Do your best to
  correct any parse errors discovered.

  Also here are some additional Mermaid format guidelines:
  * Avoid labels/node names with parenthesis, brackets or braces, unless surrrounded with quotes.  These can cause syntax errors
    - eg if you want to use a label like `plural-mgmt (mgmt)` for an eks cluster, enclose it with quotes like `"plural-mgmt (mgmt)"`
  * Do not include newline or `\n` characters in node names, they cannot be rendered properly.  Stick to just normal whitespace separators instead.
  * Make different node types different colors to improve differentiation.
  """

  @type error :: Console.error
  @type research_resp :: {:ok, InfraResearch.t} | {:error, error}

  @spec get!(binary) :: InfraResearch.t
  def get!(id), do: Repo.get!(InfraResearch, id)

  @doc """
  Creates a new research task for the given user.
  """
  @spec create_research(map, User.t) :: research_resp
  def create_research(attrs, %User{id: id}) do
    %InfraResearch{user_id: id}
    |> InfraResearch.changeset(attrs)
    |> Repo.insert()
    |> notify(:create)
  end

  @doc """
  Makes an ai tool call to correct formatting on an existing research diagram
  """
  @spec fix_diagram(binary, InfraResearch.t | binary, User.t) :: research_resp
  def fix_diagram(error, %InfraResearch{diagram: diagram} = research, %User{}) when is_binary(diagram) do
    msgs = [
      {:user, "Here is the current diagram: #{diagram}"},
      {:user, "Here is the current parsing error: #{error}"}
    ]
    with {:ok, %{diagram: diagram}} <- Provider.simple_tool_call(msgs, FixDiagram, preface: @preface) do
      InfraResearch.changeset(research, %{diagram: diagram})
      |> Repo.update()
      |> notify(:update)
    end
  end
  def fix_diagram(error, id, %User{} = user) when is_binary(id), do: fix_diagram(error, get!(id), user)
  def fix_diagram(_, _, _), do: {:error, "only the creator of this research can fix diagrams"}

  defp notify({:ok, %InfraResearch{} = build}, :create),
    do: handle_notify(PubSub.InfraResearchCreated, build)
  defp notify(pass, _), do: pass
end
