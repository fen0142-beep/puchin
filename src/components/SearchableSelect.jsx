import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * 可搜尋下拉選單（typeahead）
 *
 * Props:
 *  - value:        目前選中項目的 value（string）；空字串 = 未設定
 *  - onChange:     (value) => void
 *  - options:      [{ value, label, sublabel?, searchText? }]
 *      - searchText 若未提供，會自動拼 label + sublabel 來搜尋
 *  - placeholder:  未設定時顯示文字（預設「（未設定）」）
 *  - searchPlaceholder: 搜尋框 placeholder（預設「搜尋…」）
 *  - emptyHint:    搜尋無結果時顯示文字（預設「無符合項目」）
 *  - className:    外層 wrapper 的 className（控制寬度）
 *  - clearable:    是否可清空（預設 true）
 *  - autoFocus:    開啟下拉時自動 focus 搜尋框（預設 true）
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder       = '（未設定）',
  searchPlaceholder = '搜尋姓名／班級…',
  emptyHint         = '無符合項目',
  className         = '',
  clearable         = true,
  autoFocus         = true,
}) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [hoverIdx, setHoverIdx] = useState(0)
  const wrapRef             = useRef(null)
  const searchRef           = useRef(null)
  const listRef             = useRef(null)

  // 找目前選中項目（顯示用）
  const selected = useMemo(
    () => options.find(o => o.value === value) ?? null,
    [options, value]
  )

  // 過濾後的選項
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(o => {
      const text = (o.searchText ?? `${o.label ?? ''} ${o.sublabel ?? ''}`).toLowerCase()
      return text.includes(q)
    })
  }, [options, query])

  // 搜尋變動時 reset hover
  useEffect(() => { setHoverIdx(0) }, [query, open])

  // 點選外部關閉
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // 開啟時 focus 搜尋框
  useEffect(() => {
    if (open && autoFocus && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open, autoFocus])

  // hover 變動時 scroll 到該項
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[hoverIdx]
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
  }, [hoverIdx, open])

  function pick(val) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHoverIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHoverIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtered[hoverIdx]
      if (o) pick(o.value)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* 顯示按鈕 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        <span className={`truncate text-left ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected ? (
            <>
              <span>{selected.label}</span>
              {selected.sublabel && <span className="text-gray-400 ml-1.5">{selected.sublabel}</span>}
            </>
          ) : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 text-gray-400">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={e => { e.stopPropagation(); onChange('') }}
              className="hover:text-red-500 px-1 text-base leading-none"
              title="清空"
            >×</span>
          )}
          <span className="text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {/* 下拉浮層 */}
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-amber-300"
            />
          </div>
          <div ref={listRef} className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">{emptyHint}</div>
            ) : (
              filtered.map((o, i) => (
                <div
                  key={o.value}
                  onMouseEnter={() => setHoverIdx(i)}
                  onClick={() => pick(o.value)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                    i === hoverIdx ? 'bg-amber-50' : ''
                  } ${o.value === value ? 'font-semibold text-amber-700' : 'text-gray-700'}`}
                >
                  <span className="truncate">
                    <span>{o.label}</span>
                    {o.sublabel && <span className="text-gray-400 ml-1.5 text-xs">{o.sublabel}</span>}
                  </span>
                  {o.value === value && <span className="text-amber-600 text-xs shrink-0">✓</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
