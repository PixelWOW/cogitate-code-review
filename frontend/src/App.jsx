import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom'
import {
  calculateRater,
  calculateTemplate,
  getApiBaseUrl,
  getHealth,
  getRaterConfig,
  getTemplateConfig,
  listRaters,
  listTemplates,
  saveUploadedRater,
  uploadWorkbook,
} from './api'

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function mapBackendArtifact(item, source) {
  return {
    id: item.slug,
    name: item.name || item.slug,
    source,
    status: source === 'templates' ? 'template' : 'live',
    description: item.description || '',
  }
}

function getDefaultForInput(input) {
  if (Object.prototype.hasOwnProperty.call(input, 'default')) return input.default
  if (input.type === 'dropdown' && Array.isArray(input.options) && input.options.length) return input.options[0]
  if (input.type === 'number') return ''
  if (input.type === 'boolean') return false
  return ''
}

function buildInitialValues(config) {
  const values = {}
  for (const input of config?.inputs || []) {
    values[input.field] = getDefaultForInput(input)
  }
  return values
}

function formatOutputValue(value) {
  if (typeof value === 'number') return value.toLocaleString()
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function Header({ mode = 'admin' }) {
  const adminActive = mode === 'admin'
  return (
    <header className="topbar">
      <div className="brand-mark">CR</div>
      <div>
        <h1>{mode === 'admin' ? 'Cogitate Command Board' : 'Cogitate Client Calculator'}</h1>
        <p>{mode === 'admin' ? 'Manage live raters from backend metadata' : 'Run calculations with backend schema and engine'}</p>
      </div>
      <span className={`workspace-pill ${mode === 'admin' ? 'workspace-pill-admin' : 'workspace-pill-client'}`}>
        {mode === 'admin' ? 'Admin Workspace' : 'Client Workspace'}
      </span>
      <div className="topbar-actions">
        <Link to="/admin/raters" className={adminActive ? 'link-btn link-btn-solid mode-active' : 'link-btn mode-inactive'}>Admin</Link>
        <Link to="/app" className={!adminActive ? 'link-btn link-btn-solid mode-active' : 'link-btn mode-inactive'}>Client</Link>
      </div>
    </header>
  )
}

function DynamicInputsForm({ config, values, setValues }) {
  const groups = useMemo(() => {
    const grouped = new Map()
    for (const input of config?.inputs || []) {
      const groupName = input.group || 'General'
      if (!grouped.has(groupName)) grouped.set(groupName, [])
      grouped.get(groupName).push(input)
    }
    return Array.from(grouped.entries())
  }, [config])

  if (!config?.inputs?.length) return <p>No input definitions found in backend config.</p>

  return (
    <>
      {groups.map(([groupName, inputs]) => (
        <div key={groupName} className="panel-sub" style={{ marginBottom: 12 }}>
          <h3>{groupName}</h3>
          {inputs.map((input) => {
            const value = values[input.field] ?? ''
            const onChange = (next) => setValues((prev) => ({ ...prev, [input.field]: next }))
            const id = `input-${input.field}`

            if (input.type === 'dropdown') {
              return (
                <label key={input.field} htmlFor={id}>
                  {input.label || input.field}
                  <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)}>
                    {(input.options || []).map((option) => (
                      <option key={`${input.field}-${String(option)}`} value={String(option)}>{String(option)}</option>
                    ))}
                  </select>
                </label>
              )
            }

            if (input.type === 'boolean') {
              return (
                <label key={input.field} htmlFor={id}>
                  {input.label || input.field}
                  <select id={id} value={String(Boolean(value))} onChange={(e) => onChange(e.target.value === 'true')}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </label>
              )
            }

            return (
              <label key={input.field} htmlFor={id}>
                {input.label || input.field}
                <input
                  id={id}
                  value={value}
                  onChange={(e) => onChange(input.type === 'number' ? e.target.value : e.target.value)}
                  placeholder={input.cell ? `Maps to ${input.cell}` : ''}
                />
              </label>
            )
          })}
        </div>
      ))}
    </>
  )
}

function OutputPanel({ config, result }) {
  if (!result) return <p>No calculation yet.</p>

  const primaryOutput = (config?.outputs || []).find((item) => item.primary) || (config?.outputs || [])[0]
  const primaryValue = primaryOutput ? result[primaryOutput.field] : undefined
  const rows = (config?.outputs || []).filter((item) => item.field in result)

  return (
    <>
      {primaryOutput && <div className="hero-result">{formatOutputValue(primaryValue)}</div>}
      <table>
        <thead>
          <tr><th>Output</th><th>Value</th></tr>
        </thead>
        <tbody>
          {rows.map((output) => (
            <tr key={output.field}>
              <td>{output.label || output.field}</td>
              <td>{formatOutputValue(result[output.field])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function AdminShell({ children, raterId }) {
  return (
    <div className="shell shell-admin">
      <Header mode="admin" />
      <div className="flow-strip">
        {['Discover', 'Upload', 'Inspect', 'Test'].map((step, i) => (
          <div key={step} className="flow-chip">
            <span>{i + 1}</span>
            {step}
          </div>
        ))}
      </div>
      <div className="content-grid">
        <aside className="sidepanel">
          <NavLink to="/admin/raters" end className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>Rater List</NavLink>
          <NavLink to="/admin/upload" className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>Upload Wizard</NavLink>
          {raterId && <NavLink to={`/admin/rater/${raterId}`} end className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>Schema Viewer</NavLink>}
          {raterId && <NavLink to={`/admin/rater/${raterId}/test`} className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>Test Workspace</NavLink>}
        </aside>
        <main>{children}</main>
      </div>
    </div>
  )
}

function AdminRaterListPage({ artifacts }) {
  const [q, setQ] = useState('')
  const filtered = artifacts.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <AdminShell>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Backend Artifacts</h2>
            <p>Directly loaded from /api/raters and /api/templates.</p>
          </div>
          <Link to="/admin/upload" className="primary">Upload New</Link>
        </div>
        <div className="filter-row">
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by rater/template name" />
        </div>
        {!filtered.length ? (
          <div className="empty-card">
            <h3>No backend artifacts found</h3>
            <p>Ensure backend is running and raters/templates folders contain valid config.json + template.xlsx.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Type</th><th>Description</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><span className="badge">{r.status}</span></td>
                  <td>{r.description || '-'}</td>
                  <td className="row-actions">
                    <Link to={`/admin/rater/${r.id}`}>View Schema</Link>
                    <Link to={`/admin/rater/${r.id}/test`}>Test</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  )
}

function AdminUploadPage({ onUpload }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('Commercial Insurance')
  const [savedName, setSavedName] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  return (
    <AdminShell>
      <section className="panel">
        <h2>Upload Wizard</h2>
        <p>Step {step + 1} of 3</p>
        <div className="stepper-strip" aria-label="Upload progress">
          {[0, 1, 2].map((n) => <span key={n} className={n <= step ? 'dot dot-active' : 'dot'} />)}
        </div>
        {step === 0 && (
          <div className="wizard-step">
            <h3>Upload Workbook</h3>
            <p>Select a workbook with _Schema sheet to parse through backend.</p>
            <label className="upload-box">
              <span>Select .xlsx or .xls file</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (!selected) return
                  setSelectedFile(selected)
                  setFileName(selected.name)
                  setUploadStatus('Workbook selected.')
                  setError('')
                  if (!name) setName(selected.name.replace(/\.[^.]+$/, ''))
                }}
              />
            </label>
            {fileName && <p className="upload-meta"><strong>File:</strong> {fileName}</p>}
            {uploadStatus && <p className="success-note">{uploadStatus}</p>}
            <button className="primary" onClick={() => setStep(1)} disabled={!fileName}>Continue</button>
          </div>
        )}
        {step === 1 && (
          <div className="wizard-step">
            <h3>Metadata</h3>
            <label>Rater Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cargo Protector Plus" />
            <label>Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} />
            <div className="wizard-actions">
              <button onClick={() => setStep(0)}>Back</button>
              <button className="primary" onClick={() => setStep(2)}>Continue</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="wizard-step">
            <h3>Confirm and Save</h3>
            <p><strong>Name:</strong> {name || 'Untitled Rater'}</p>
            <p><strong>Domain:</strong> {domain}</p>
            <button
              className="primary"
              disabled={isSaving || !selectedFile}
              onClick={async () => {
                if (!selectedFile) {
                  setError('Select a workbook before saving.')
                  return
                }
                setIsSaving(true)
                setError('')
                try {
                  const finalName = name || 'Untitled Rater'
                  await onUpload({ name: finalName, domain, fileName, file: selectedFile })
                  setSavedName(finalName)
                  setStep(0)
                  setName('')
                  setFileName('')
                  setSelectedFile(null)
                  setUploadStatus('Rater saved successfully.')
                } catch (e) {
                  setError(e.message || 'Failed to save rater')
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Save Rater'}
            </button>
            {error && <p className="warn">{error}</p>}
            <p className="success-note">Last saved: {savedName || 'None yet'}</p>
          </div>
        )}
      </section>
    </AdminShell>
  )
}

function AdminEditorPage({ artifacts, getConfig }) {
  const { id } = useParams()
  const artifact = artifacts.find((r) => r.id === id)
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [values, setValues] = useState({})

  useEffect(() => {
    if (!artifact) return
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const nextConfig = await getConfig(artifact.id, artifact.source)
        if (!mounted) return
        setConfig(nextConfig)
        setValues(buildInitialValues(nextConfig))
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load backend config')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [artifact, getConfig])

  if (!artifact) return <Navigate to="/admin/raters" replace />

  return (
    <AdminShell raterId={id}>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{artifact.name} Schema Viewer</h2>
            <p>Rendered from backend config endpoint.</p>
          </div>
          <Link className="primary" to={`/admin/rater/${id}/test`}>Go to Test</Link>
        </div>
        {loading && <p>Loading backend config...</p>}
        {error && <p className="warn">{error}</p>}
        {!loading && !error && <DynamicInputsForm config={config} values={values} setValues={setValues} />}
      </section>
    </AdminShell>
  )
}

function AdminTestPage({ artifacts, getConfig, onRunTest }) {
  const { id } = useParams()
  const artifact = artifacts.find((r) => r.id === id)
  const [config, setConfig] = useState(null)
  const [values, setValues] = useState({})
  const [result, setResult] = useState(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [raw, setRaw] = useState('{}')
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!artifact) return
    let mounted = true
    const load = async () => {
      setError('')
      try {
        const nextConfig = await getConfig(artifact.id, artifact.source)
        if (!mounted) return
        const defaults = buildInitialValues(nextConfig)
        setConfig(nextConfig)
        setValues(defaults)
        setRaw(JSON.stringify(defaults, null, 2))
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load backend config')
      }
    }
    load()
    return () => { mounted = false }
  }, [artifact, getConfig])

  if (!artifact) return <Navigate to="/admin/raters" replace />

  const run = async () => {
    let payload = values
    if (jsonMode) {
      try {
        payload = JSON.parse(raw)
      } catch {
        setError('Malformed JSON payload.')
        return
      }
    }
    setError('')
    setIsRunning(true)
    try {
      const outputs = await onRunTest(artifact.id, payload, artifact.source)
      setResult(outputs)
    } catch (e) {
      setError(e.message || 'Calculation failed')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <AdminShell raterId={id}>
      <section className="panel two-col">
        <div className="panel-sub">
          <div className="panel-head"><h3>Inputs</h3><button onClick={() => setJsonMode((v) => !v)}>{jsonMode ? 'Use Form' : 'Use JSON'}</button></div>
          {jsonMode ? <textarea rows={16} value={raw} onChange={(e) => setRaw(e.target.value)} /> : <DynamicInputsForm config={config} values={values} setValues={setValues} />}
          {error && <p className="warn">{error}</p>}
          <button className="primary" onClick={run} disabled={isRunning}>{isRunning ? 'Running...' : 'Run Test'}</button>
        </div>
        <div className="panel-sub">
          <h3>Output</h3>
          <OutputPanel config={config} result={result} />
        </div>
      </section>
    </AdminShell>
  )
}

function ClientCalculatorPage({ artifacts, getConfig, onRunCalculation }) {
  const [selected, setSelected] = useState('')
  const [config, setConfig] = useState(null)
  const [values, setValues] = useState({})
  const [result, setResult] = useState(null)
  const [calcError, setCalcError] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)

  const activeArtifact = artifacts.find((r) => r.id === selected)

  useEffect(() => {
    if (!selected && artifacts.length) setSelected(artifacts[0].id)
  }, [selected, artifacts])

  useEffect(() => {
    if (!activeArtifact) return
    let mounted = true
    const load = async () => {
      setCalcError('')
      try {
        const nextConfig = await getConfig(activeArtifact.id, activeArtifact.source)
        if (!mounted) return
        setConfig(nextConfig)
        setValues(buildInitialValues(nextConfig))
        setResult(null)
      } catch (e) {
        if (mounted) setCalcError(e.message || 'Failed to load config')
      }
    }
    load()
    return () => { mounted = false }
  }, [activeArtifact, getConfig])

  const runCalculation = async () => {
    if (!activeArtifact) return
    setCalcError('')
    setIsCalculating(true)
    try {
      const outputs = await onRunCalculation(activeArtifact.id, values, activeArtifact.source)
      setResult(outputs)
    } catch (e) {
      setCalcError(e.message || 'Calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className="shell shell-client">
      <Header mode="client" />
      <main className="client-main client-main-enhanced">
        <section className="client-hero">
          <div>
            <h2>Quote Scenario Studio</h2>
            <p>Inputs and outputs are rendered from backend config and live calculation results.</p>
          </div>
          <div className="hero-meta-cards">
            <article>
              <span>Selected Artifact</span>
              <strong>{activeArtifact?.name || 'None selected'}</strong>
            </article>
            <article>
              <span>Type</span>
              <strong>{activeArtifact?.status || 'n/a'}</strong>
            </article>
          </div>
        </section>
        <section className="panel two-col quote-workspace">
          <div className="panel-sub">
            <h2>Scenario Input</h2>
            <label>
              Rater / Template
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {artifacts.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
            <DynamicInputsForm config={config} values={values} setValues={setValues} />
            <div className="inline-actions">
              <button onClick={() => setValues(buildInitialValues(config))}>Reset to Defaults</button>
              <button className="primary" onClick={runCalculation} disabled={!activeArtifact || isCalculating}>{isCalculating ? 'Calculating...' : 'Calculate'}</button>
            </div>
            {calcError && <p className="warn">{calcError}</p>}
          </div>
          <div className="panel-sub">
            <h2>Result Panel</h2>
            <OutputPanel config={config} result={result} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default function App() {
  const [artifacts, setArtifacts] = useState([])
  const [configCache, setConfigCache] = useState({})
  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState('')

  const refreshArtifacts = async () => {
    const [liveRaters, templates] = await Promise.all([listRaters(), listTemplates()])
    const merged = [
      ...liveRaters.map((item) => mapBackendArtifact(item, 'raters')),
      ...templates.map((item) => mapBackendArtifact(item, 'templates')),
    ]
    setArtifacts(merged)
    return merged
  }

  const getConfig = async (id, source) => {
    const cacheKey = `${source}:${id}`
    if (configCache[cacheKey]) return configCache[cacheKey]
    const config = source === 'templates' ? await getTemplateConfig(id) : await getRaterConfig(id)
    setConfigCache((prev) => ({ ...prev, [cacheKey]: config }))
    return config
  }

  useEffect(() => {
    let mounted = true
    const bootstrap = async () => {
      setLoading(true)
      try {
        await getHealth()
        const rows = await refreshArtifacts()
        if (mounted) {
          setConnection(`Connected to backend at ${getApiBaseUrl()}. Loaded ${rows.length} artifacts.`)
        }
      } catch (e) {
        if (mounted) {
          setArtifacts([])
          setConnection(`Backend unavailable at ${getApiBaseUrl()}. ${e.message || 'No fallback data is shown.'}`)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    bootstrap()
    return () => { mounted = false }
  }, [])

  const actions = useMemo(() => ({
    upload: async ({ name, domain, fileName, file }) => {
      const uploadResp = await uploadWorkbook(file)
      const savePayload = {
        upload_id: uploadResp.upload_id,
        config: uploadResp.config,
        slug: slugify(name) || `rater-${Date.now()}`,
        name,
        description: `${domain || 'General'} | Uploaded from ${fileName || file?.name || 'workbook'}`,
        source: 'raters',
      }
      await saveUploadedRater(savePayload)
      await refreshArtifacts()
      setConfigCache({})
    },
    runCalculation: async (id, values, source) => {
      const response = source === 'templates'
        ? await calculateTemplate(id, values)
        : await calculateRater(id, values)
      return response.outputs || response
    },
  }), [])

  return (
    <>
      <div className="connection-note">{loading ? 'Connecting to backend...' : connection}</div>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/raters" replace />} />
        <Route path="/admin/raters" element={<AdminRaterListPage artifacts={artifacts} />} />
        <Route path="/admin/upload" element={<AdminUploadPage onUpload={actions.upload} />} />
        <Route path="/admin/rater/:id" element={<AdminEditorPage artifacts={artifacts} getConfig={getConfig} />} />
        <Route path="/admin/rater/:id/test" element={<AdminTestPage artifacts={artifacts} getConfig={getConfig} onRunTest={actions.runCalculation} />} />
        <Route path="/app" element={<ClientCalculatorPage artifacts={artifacts} getConfig={getConfig} onRunCalculation={actions.runCalculation} />} />
        <Route path="*" element={<Navigate to="/admin/raters" replace />} />
      </Routes>
    </>
  )
}
