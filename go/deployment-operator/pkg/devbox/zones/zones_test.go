package zones

import (
	"context"
	"testing"
	"time"

	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func TestOrderAndPick(t *testing.T) {
	g := NewWithT(t)
	all := []string{"a", "b", "c"}
	g.Expect(Order(all, nil)).To(Equal(all), "spec order between equals")
	g.Expect(Order(all, map[string]int64{"b": 2, "c": 2, "a": 1})).To(Equal([]string{"b", "c", "a"}))

	homes := map[string]int64{"b": 3, "c": 1}
	g.Expect(Pick(all, homes, map[string]int64{"b": 1, "c": 1})).To(Equal("b"), "packs into the zone with most homes")
	g.Expect(Pick(all, homes, map[string]int64{"c": 1})).To(Equal("c"), "next zone with room when the fullest has none")
	g.Expect(Pick(all, homes, nil)).To(Equal("b"), "no room anywhere grows the fullest zone")
	g.Expect(Pick(nil, homes, nil)).To(BeEmpty())
}

func TestSpread(t *testing.T) {
	g := NewWithT(t)
	g.Expect(Spread(1, []string{"a", "b", "c"})).To(Equal(map[string]int64{"a": 1}), "min 1 isn't repeated per zone")
	g.Expect(Spread(5, []string{"a", "b"})).To(Equal(map[string]int64{"a": 3, "b": 2}))
	g.Expect(Spread(3, nil)).To(BeEmpty())
}

func TestOfActor(t *testing.T) {
	g := NewWithT(t)
	g.Expect(OfActor(&ateapi.Actor{WorkerSelector: Selector("us-east-2b")})).To(Equal("us-east-2b"))
	g.Expect(OfActor(&ateapi.Actor{})).To(BeEmpty())
}

func TestDemand(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	scheme := runtime.NewScheme()
	g.Expect(corev1.AddToScheme(scheme)).To(Succeed())
	kube := fake.NewClientBuilder().WithScheme(scheme).Build()
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	d := &Demand{Client: kube, Namespace: "ns", Now: func() time.Time { return now }}

	waiting, err := d.Waiting(ctx, "space")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(waiting).To(BeEmpty())

	g.Expect(d.Want(ctx, "space", "box-1", "a")).To(Succeed())
	g.Expect(d.Want(ctx, "space", "box-2", "b")).To(Succeed())
	now = now.Add(time.Minute)
	g.Expect(d.Want(ctx, "space", "box-1", "a")).To(Succeed())

	waiting, err = d.Waiting(ctx, "space")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(waiting).To(HaveLen(2))
	g.Expect(waiting["box-1"].Since).To(Equal(now.Add(-time.Minute)), "refreshing keeps when the wait began")
	g.Expect(waiting["box-1"].Seen).To(Equal(now))

	g.Expect(d.Done(ctx, "space", "box-2")).To(Succeed())
	waiting, err = d.Waiting(ctx, "space")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(waiting).To(HaveKey("box-1"))
	g.Expect(waiting).NotTo(HaveKey("box-2"))

	now = now.Add(DemandTTL + time.Second)
	waiting, err = d.Waiting(ctx, "space")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(waiting).To(BeEmpty(), "entries of a gateway that died mid-wait expire")

	cm := &corev1.ConfigMap{}
	g.Expect(kube.Get(ctx, client.ObjectKey{Namespace: "ns", Name: DemandName("space")}, cm)).To(Succeed())
	g.Expect(cm.Labels).To(HaveKeyWithValue(DemandLabel, "true"))

	g.Expect(d.Done(ctx, "other", "box")).To(Succeed(), "no ConfigMap is fine")
	g.Expect(d.Delete(ctx, "space")).To(Succeed())
	g.Expect(d.Delete(ctx, "space")).To(Succeed())
}
