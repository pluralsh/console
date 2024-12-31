defmodule Console.GraphQl.PluralQueriesTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Plural

  describe "account" do
    test "it can fetch account info" do
      account = %Plural.Account{
        grandfatheredUntil: Timex.now(),
        subscription: %Plural.Subscription{
          id: "sub-id",
          plan: %Plural.Plan{
            id: "plan-id",
            period: "MONTHLY",
            name: "Pro"
          }
        }
      }
      expect(Console.Features, :account, fn -> account end)

      {:ok, %{data: %{"account" => found}}} = run_query("""
        query {
          account {
            grandfatheredUntil
            subscription {
              id
              plan { id period name }
            }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert found["grandfatheredUntil"]
      assert found["subscription"]["plan"]["name"] == "Pro"
    end
  end
end
