package utils

import (
	"context"

	v1 "k8s.io/api/core/v1"
	k8sclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/controller/api/v1alpha1"
	"github.com/pluralsh/console/controller/internal/client"
)

type ConsoleHelper struct {
	ctx    context.Context
	client client.ConsoleClient
	reader k8sclient.Reader
}

func (in *ConsoleHelper) IDFromRef(ref *v1.ObjectReference, resource v1alpha1.PluralResource) (*string, error) {
	if ref == nil {
		return nil, nil
	}

	err := in.reader.Get(in.ctx, k8sclient.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, resource)
	return resource.ConsoleID(), err
}

func NewConsoleHelper(ctx context.Context, client client.ConsoleClient, k8sClient k8sclient.Client) *ConsoleHelper {
	return &ConsoleHelper{
		ctx:    ctx,
		client: client,
		reader: k8sClient,
	}
}
