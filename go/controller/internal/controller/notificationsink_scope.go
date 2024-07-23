package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type NotificationSinkScope struct {
	Client           client.Client
	NotificationSink *v1alpha1.NotificationSink
	ctx              context.Context
	patchHelper      *patch.Helper
}

func (p *NotificationSinkScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.NotificationSink)
}

func NewNotificationSinkScope(ctx context.Context, client client.Client, notificationSink *v1alpha1.NotificationSink) (*NotificationSinkScope, error) {
	if notificationSink == nil {
		return nil, errors.New("failed to create new notificationSink scope, got nil notificationSink")
	}

	helper, err := patch.NewHelper(notificationSink, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new pipeline scope, go error: %s", err)
	}

	return &NotificationSinkScope{
		Client:           client,
		NotificationSink: notificationSink,
		ctx:              ctx,
		patchHelper:      helper,
	}, nil
}
