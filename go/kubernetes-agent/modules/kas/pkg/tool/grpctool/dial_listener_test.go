package grpctool

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/util/wait"
)

var (
	_ net.Listener = &DialListener{}
)

func TestDialListener_CloseUnblocksAccept(t *testing.T) {
	t.Run("async", func(t *testing.T) {
		l := NewDialListener()
		var wg wait.Group
		wg.Start(func() {
			conn, err := l.Accept()
			assert.EqualError(t, err, "listener closed, cannot accept")
			assert.Nil(t, conn)
		})
		time.Sleep(100 * time.Millisecond)
		err := l.Close()
		require.NoError(t, err)
		wg.Wait()
	})
	t.Run("sync", func(t *testing.T) {
		l := NewDialListener()
		err := l.Close()
		require.NoError(t, err)
		conn, err := l.Accept()
		assert.EqualError(t, err, "listener closed, cannot accept")
		assert.Nil(t, conn)
	})
}

func TestDialListener_AcceptReturnsErrorAfterClose(t *testing.T) {
	l := NewDialListener()
	err := l.Close()
	require.NoError(t, err)
	conn, err := l.Accept()
	assert.EqualError(t, err, "listener closed, cannot accept")
	assert.Nil(t, conn)
}

func TestDialListener_DoubleClose(t *testing.T) {
	l := NewDialListener()
	err := l.Close()
	assert.NoError(t, err)
	err = l.Close()
	assert.NoError(t, err)
}

func TestDialListener_CloseUnblocksDial(t *testing.T) {
	t.Run("async", func(t *testing.T) {
		l := NewDialListener()
		var wg wait.Group
		wg.Start(func() {
			conn, err := l.DialContext(context.Background(), "bla")
			assert.EqualError(t, err, "listener closed, cannot dial")
			assert.Nil(t, conn)
		})
		time.Sleep(100 * time.Millisecond)
		err := l.Close()
		require.NoError(t, err)
		wg.Wait()
	})
	t.Run("sync", func(t *testing.T) {
		l := NewDialListener()
		err := l.Close()
		require.NoError(t, err)
		conn, err := l.DialContext(context.Background(), "bla")
		assert.EqualError(t, err, "listener closed, cannot dial")
		assert.Nil(t, conn)
	})
}

func TestDialListener_DialReturnsErrorAfterClose(t *testing.T) {
	l := NewDialListener()
	err := l.Close()
	require.NoError(t, err)
	conn, err := l.DialContext(context.Background(), "bla")
	assert.EqualError(t, err, "listener closed, cannot dial")
	assert.Nil(t, conn)
}

func TestDialListener_HappyPath(t *testing.T) {
	l := NewDialListener()
	var wg wait.Group
	wg.Start(func() {
		in := []byte{1, 2, 3}
		conn, err := l.DialContext(context.Background(), "bla")
		assert.NoError(t, err)
		_, err = conn.Write(in)
		assert.NoError(t, err)
		read := make([]byte, len(in)*2)
		n, err := conn.Read(read)
		assert.NoError(t, err)
		assert.Equal(t, in, read[:n])
	})
	conn, err := l.Accept()
	require.NoError(t, err)
	read := make([]byte, 64)
	n, err := conn.Read(read)
	require.NoError(t, err)
	_, err = conn.Write(read[:n])
	require.NoError(t, err)
	wg.Wait()
}
