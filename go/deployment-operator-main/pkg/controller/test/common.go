package test

import "github.com/pluralsh/deployment-operator/pkg/websocket"

const name = "fake"

type FakePublisher struct {
}

func (sp *FakePublisher) Publish(id string, kick bool) {}

type FakeSocket struct{}

func (s *FakeSocket) AddPublisher(event string, publisher websocket.Publisher) {}

func (s *FakeSocket) Join() error {
	return nil
}

func (s *FakeSocket) Close() error {
	return nil
}
