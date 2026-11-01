import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const RouterContext = createContext({ path: '/', navigate: () => {}, query: new URLSearchParams() })

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(() => ({
    path: window.location.pathname,
    search: window.location.search,
  }))

  useEffect(() => {
    const onPop = () => setLocation({ path: window.location.pathname, search: window.location.search })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to) => {
    const [path, search = ''] = String(to).split('?')
    window.history.pushState({}, '', `${path}${search ? `?${search}` : ''}`)
    setLocation({ path, search: search ? `?${search}` : '' })
    window.scrollTo({ top: 0 })
  }, [])

  const value = useMemo(
    () => ({
      path: location.path,
      search: location.search,
      query: new URLSearchParams(location.search),
      navigate,
    }),
    [location, navigate]
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export const useRouter = () => useContext(RouterContext)

export function Link({ to, children, className = '', onClick, ...rest }) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return
        event.preventDefault()
        onClick?.()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
