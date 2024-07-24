package controller

import (
	"context"
	"errors"
	"fmt"

	"sigs.k8s.io/cluster-api/util/patch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type NotificationRouterScope struct {
	Client             client.Client
	NotificationRouter *v1alpha1.NotificationRouter
	ctx                context.Context
	patchHelper        *patch.Helper
}

func (p *NotificationRouterScope) PatchObject() error {
	return p.patchHelper.Patch(p.ctx, p.NotificationRouter)
}

func NewNotificationRouterScope(ctx context.Context, client client.Client, notification *v1alpha1.NotificationRouter) (*NotificationRouterScope, error) {
	if notification == nil {
		return nil, errors.New("failed to create new notificationRouter scope, got nil notificationRouter")
	}

	helper, err := patch.NewHelper(notification, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create new notification router scope, go error: %s", err)
	}

	return &NotificationRouterScope{
		Client:             client,
		NotificationRouter: notification,
		ctx:                ctx,
		patchHelper:        helper,
	}, nil
}
