defmodule Console.Deployments.PubSub.Email do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100
  alias Console.Deployments.PubSub.Emailable


  def handle_event(event) do
    with %Bamboo.Email{} = email <- Emailable.email(event) do
      Console.Mailer.maybe_deliver(email)
    end
  end
end
