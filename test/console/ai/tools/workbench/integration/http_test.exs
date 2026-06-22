defmodule Console.AI.Tools.Workbench.Integration.HttpTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Integration.Http

  describe "error/2" do
    test "formats TLS alert errors without leaking HTTPoison structs downstream" do
      reason = %HTTPoison.Error{
        reason:
          {:tls_alert,
           {:unknown_ca,
            ~c"TLS client: In state certify at ssl_handshake.erl: certificate verify failed"}}
      }

      assert {:error, message} = Http.error("GitLab", reason)
      assert message =~ "GitLab request failed: TLS unknown_ca:"
      assert message =~ "certificate verify failed"
      refute message =~ "%HTTPoison.Error"
    end

    test "formats ordinary transport errors" do
      assert Http.error("GitHub", %HTTPoison.Error{reason: :econnrefused}) ==
               {:error, "GitHub request failed: econnrefused"}
    end
  end
end
