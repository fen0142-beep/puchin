import { useState, useEffect } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { getMonks, createMonk, updateMonk, deleteMonk } from '../../lib/supabase'

const EMPTY_FORM = { name: '', notes: '' }

export default function MonksPage() {
  const [monks,   setMonks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // null | { mode: 'add' | 'edit', monk?: {} }
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { monks: data } = await getMonks(true)   // 含停用的
    setMonks(data)
    setLoading(false)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setModal({ mode: 'add' })
  }

  function openEdit(monk) {
    setForm({ name: monk.name, notes: monk.notes ?? '' })
    setModal({ mode: 'edit', monk })
  }

  function closeModal() {
    setModal(null)
    setForm(EMPTY_FORM)
    setMsg('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setMsg('請輸入法師名稱'); return }
    setSaving(true); setMsg('')
    let res
    if (modal.mode === 'add') {
      res = await createMonk(form.name.trim(), form.notes.trim())
    } else {
      res = await updateMonk(modal.monk.id, { name: form.name.trim(), notes: form.notes.trim() })
    }
    setSaving(false)
    if (res.success) {
      await load()
      closeModal()
    } else {
      setMsg('儲存失敗：' + res.error)
    }
  }

  async function handleToggleActive(monk) {
    if (monk.active) {
      if (!window.confirm(`確定要停用「${monk.name}」？停用後不會出現在排車選單中。`)) return
    }
    await updateMonk(monk.id, { active: !monk.active })
    await load()
  }

  async function handleDelete(monk) {
    if (!window.confirm(`確定要刪除「${monk.name}」？這個動作無法復原，該法師的所有車輛指派紀錄也會一併刪除。`)) return
    const res = await deleteMonk(monk.id)
    if (!res.success) { alert('刪除失敗：' + res.error); return }
    await load()
  }

  const activeMonks   = monks.filter(m => m.active)
  const inactiveMonks = monks.filter(m => !m.active)

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* 頁首 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">法師管理</h1>
            <p className="text-sm text-gray-400 mt-0.5">管理可指派到車輛的法師名單</p>
          </div>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors font-medium"
          >
            ＋ 新增法師
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">載入中…</div>
        ) : (
          <>
            {/* 在籍法師 */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                在籍法師（{activeMonks.length} 位）
              </h2>
              {activeMonks.length === 0 ? (
                <div className="text-sm text-gray-400 py-10 text-center border-2 border-dashed rounded-xl">
                  尚未新增任何法師，點右上角「＋ 新增法師」開始
                </div>
              ) : (
                <div className="bg-white rounded-xl border divide-y overflow-hidden">
                  {activeMonks.map(monk => (
                    <div key={monk.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800">{monk.name}</div>
                        {monk.notes && (
                          <div className="text-xs text-gray-400 mt-0.5">{monk.notes}</div>
                        )}
                      </div>
                      <button
                        onClick={() => openEdit(monk)}
                        className="text-xs text-blue-600 hover:underline px-2 py-1"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleToggleActive(monk)}
                        className="text-xs text-gray-400 hover:text-amber-600 hover:underline px-2 py-1"
                      >
                        停用
                      </button>
                      <button
                        onClick={() => handleDelete(monk)}
                        className="text-xs text-gray-300 hover:text-red-500 hover:underline px-2 py-1"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 已停用法師 */}
            {inactiveMonks.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  已停用（{inactiveMonks.length} 位）
                </h2>
                <div className="bg-white rounded-xl border divide-y overflow-hidden opacity-60">
                  {inactiveMonks.map(monk => (
                    <div key={monk.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-500 line-through">{monk.name}</div>
                        {monk.notes && (
                          <div className="text-xs text-gray-400 mt-0.5">{monk.notes}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleActive(monk)}
                        className="text-xs text-green-600 hover:underline px-2 py-1"
                      >
                        重新啟用
                      </button>
                      <button
                        onClick={() => handleDelete(monk)}
                        className="text-xs text-gray-300 hover:text-red-500 hover:underline px-2 py-1"
                      >
                        刪除
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* 新增 / 編輯 Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {modal.mode === 'add' ? '新增法師' : '編輯法師'}
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-gray-600">法師名稱 <span className="text-red-500">*</span></span>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：星良師父"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">備註（選填）</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="例：常住師父"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
            </div>

            {msg && <p className="mt-3 text-sm text-red-500">{msg}</p>}

            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
