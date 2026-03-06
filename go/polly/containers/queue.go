package containers

import "fmt"

type Queue[T any] struct {
	head   *queueNode[T]
	tail   *queueNode[T]
	length int
}

type queueNode[T any] struct {
	val  T
	next *queueNode[T]
}

func NewQueue[T any]() *Queue[T] {
	return &Queue[T]{length: 0}
}

func (q *Queue[T]) Push(val T) {
	node := &queueNode[T]{val: val}
	if q.head == nil {
		q.head = node
	}
	if q.tail != nil {
		q.tail.next = node
	}
	q.tail = node
	q.length += 1
}

func (q *Queue[T]) Pop() (res T, err error) {
	if q.head == nil {
		err = fmt.Errorf("queue is empty")
		return
	}

	res = q.head.val
	if q.length == 1 {
		q.tail = nil
	}
	q.head = q.head.next
	q.length -= 1
	return
}

func (q *Queue[T]) Len() int {
	return q.length
}

func (q *Queue[T]) Empty() bool {
	return q.head == nil
}
