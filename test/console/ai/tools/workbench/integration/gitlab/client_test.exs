defmodule Console.AI.Tools.Workbench.Integration.Gitlab.ClientTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.AI.Tools.Workbench.Integration.Gitlab.Client

  describe "get/3" do
    test "bubbles HTTP transport failures as string errors" do
      expect(HTTPoison, :get, fn _url, _headers, _opts ->
        {:error,
         %HTTPoison.Error{
           reason: {:tls_alert, {:unknown_ca, ~c"TLS client: certificate verify failed"}}
         }}
      end)

      assert {:error, message} =
               Client.get(
                 %{base_url: "https://gitlab.example.com/api/v4", token: "token"},
                 "/projects"
               )

      assert message =~ "GitLab request failed: TLS unknown_ca:"
      assert message =~ "certificate verify failed"
      refute message =~ "%HTTPoison.Error"
    end
  end
end
