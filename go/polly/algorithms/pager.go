package algorithms

type FetchPageFunc[T any] func(page *string, size int64) ([]T, *PageInfo, error)

type PageInfo struct {
	HasNext  bool
	After    *string
	PageSize int64
}

type Pager[T any] struct {
	pageInfo *PageInfo
	err      error

	fetchPage FetchPageFunc[T]
}

type PageIter[T any] interface {
	NextPage() ([]T, error)
}

func NewPager[T any](pageSize int64, fetchPage FetchPageFunc[T]) *Pager[T] {
	p := &Pager[T]{
		fetchPage: fetchPage,
	}
	p.pageInfo = &PageInfo{
		HasNext:  true,
		After:    nil,
		PageSize: pageSize,
	}
	return p
}

func (p *Pager[T]) NextPage() ([]T, error) {
	var list []T

	if !p.pageInfo.HasNext {
		return nil, nil
	}

	list, p.pageInfo, p.err = p.fetchPage(p.pageInfo.After, p.pageInfo.PageSize)
	if p.err != nil {
		return nil, p.err
	}
	return list, nil
}

func (p *Pager[T]) HasNext() bool {
	return p.pageInfo.HasNext
}
