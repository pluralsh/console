defmodule Console.Deployments.Pr.GitTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Pr.Git
  alias Console.Schema.ScmConnection

  defp github_conn(attrs \\ []) do
    struct!(
      %ScmConnection{type: :github, name: "gh", token: "pat"},
      attrs
    )
  end

  defp gitlab_conn(attrs \\ []) do
    struct!(
      %ScmConnection{type: :gitlab, name: "gl", token: "pat"},
      attrs
    )
  end

  defp bitbucket_conn do
    %ScmConnection{type: :bitbucket, name: "bb", token: "pat"}
  end

  defp bitbucket_datacenter_conn(base_url) do
    %ScmConnection{type: :bitbucket_datacenter, name: "bb-dc", token: "pat", base_url: base_url}
  end

  defp azure_conn(organization, project) do
    %ScmConnection{
      type: :azure_devops,
      name: "ado",
      token: "pat",
      azure: %ScmConnection.Azure{
        organization: organization,
        project: project,
        username: "pat-user"
      }
    }
  end

  describe "to_http/2" do
    test "GitHub: SCP-style ssh (git@host:org/repo)" do
      conn = github_conn()

      assert Git.to_http(conn, "git@github.com:pluralsh/console.git") ==
               "https://github.com/pluralsh/console.git"
    end

    test "GitLab: ssh:// with non-default ssh port (common for self-managed)" do
      conn = gitlab_conn()

      assert Git.to_http(conn, "ssh://git@gitlab.com:2222/mygroup/myproject.git") ==
               "https://gitlab.com/2222/mygroup/myproject.git"
    end

    test "GitHub: https clone URL is preserved and normalized to a .git suffix" do
      conn = github_conn()

      assert Git.to_http(conn, "https://github.com/pluralsh/console.git") ==
               "https://github.com/pluralsh/console.git"

      assert Git.to_http(conn, "https://github.com/pluralsh/console") ==
               "https://github.com/pluralsh/console.git"
    end

    test "GitHub Enterprise: uses base_url from the connection" do
      conn = github_conn(base_url: "https://github.acme.corp")

      assert Git.to_http(conn, "git@github.acme.corp:platform/deployments.git") ==
               "https://github.acme.corp/platform/deployments.git"
    end

    test "GitLab.com: nested groups over ssh" do
      conn = gitlab_conn()

      assert Git.to_http(conn, "git@gitlab.com:mygroup/mysubgroup/myproject.git") ==
               "https://gitlab.com/mygroup/mysubgroup/myproject.git"
    end

    test "GitLab self-managed: base_url and matching ssh host" do
      conn = gitlab_conn(base_url: "https://gitlab.example.com")

      assert Git.to_http(conn, "git@gitlab.example.com:group/repo.git") ==
               "https://gitlab.example.com/group/repo.git"
    end

    test "Bitbucket Cloud" do
      conn = bitbucket_conn()

      assert Git.to_http(conn, "git@bitbucket.org:workspace_slug/repository.git") ==
               "https://bitbucket.org/workspace_slug/repository.git"
    end

    test "Bitbucket Data Center: ssh maps onto configured HTTPS base" do
      conn = bitbucket_datacenter_conn("https://bitbucket.example.com/scm")

      assert Git.to_http(conn, "git@bitbucket.example.com:7999/PROJ/repo-key.git") ==
               "https://bitbucket.example.com/scm/7999/PROJ/repo-key.git"
    end

    test "Azure DevOps: ssh.dev.azure.com with git user and v3 path" do
      conn = azure_conn("FabrikamFiber", "FabrikamFiber")

      assert Git.to_http(
               conn,
               "git@ssh.dev.azure.com:v3/FabrikamFiber/FabrikamFiber/FabrikamWebsite"
             ) ==
               "https://dev.azure.com/FabrikamFiber/FabrikamFiber/_git/v3/FabrikamFiber/FabrikamFiber/FabrikamWebsite"
    end

    test "Azure DevOps: legacy vs-ssh.visualstudio.com with organization as ssh username (not git)" do
      conn = azure_conn("SOME-ORG", "SRE")

      assert Git.to_http(
               conn,
               "SOME-ORG@vs-ssh.visualstudio.com:v3/SOME-ORG/SRE/plural-mgmtcluster"
             ) ==
               "https://dev.azure.com/SOME-ORG/SRE/_git/v3/SOME-ORG/SRE/plural-mgmtcluster"
    end

    test "Azure DevOps: vs-ssh.visualstudio.com with explicit git username" do
      conn = azure_conn("MyOrg", "MyProject")

      assert Git.to_http(
               conn,
               "git@vs-ssh.visualstudio.com:v3/MyOrg/MyProject/my-repo.git"
             ) ==
               "https://dev.azure.com/MyOrg/MyProject/_git/v3/MyOrg/MyProject/my-repo"
    end

    test "Azure DevOps: ssh:// prefix is stripped before parsing" do
      conn = azure_conn("Contoso", "Web")

      assert Git.to_http(
               conn,
               "ssh://Contoso@vs-ssh.visualstudio.com:v3/Contoso/Web/application"
             ) ==
               "https://dev.azure.com/Contoso/Web/_git/v3/Contoso/Web/application"
    end

    test "Azure DevOps: https URL is unchanged and not given a .git suffix" do
      conn = azure_conn("Contoso", "Web")

      https =
        "https://Contoso@dev.azure.com/Contoso/Web/_git/application"

      assert Git.to_http(conn, https) == https
    end

    test "non-Azure: https URL does not duplicate .git when already present" do
      conn = github_conn()

      assert Git.to_http(conn, "https://github.com/org/repo.git") ==
               "https://github.com/org/repo.git"
    end
  end
end
