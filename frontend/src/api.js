const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      if (typeof errorBody?.detail === 'string') {
        detail = errorBody.detail
      }
    } catch {
      // Keep the generic fallback when response is not JSON.
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return response.json()
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getHealth() {
  return request('/api/health')
}

export function listRaters() {
  return request('/api/raters')
}

export function listTemplates() {
  return request('/api/templates')
}

export function getRaterConfig(slug) {
  return request(`/api/raters/${encodeURIComponent(slug)}/config`)
}

export function getTemplateConfig(name) {
  return request(`/api/templates/${encodeURIComponent(name)}/config`)
}

export function calculateRater(slug, inputs) {
  return request(`/api/raters/${encodeURIComponent(slug)}/calculate`, {
    method: 'POST',
    body: JSON.stringify(inputs),
  })
}

export function calculateTemplate(name, inputs) {
  return request(`/api/templates/${encodeURIComponent(name)}/calculate`, {
    method: 'POST',
    body: JSON.stringify(inputs),
  })
}

export function uploadWorkbook(file) {
  const formData = new FormData()
  formData.append('file', file)
  return fetch(`${API_BASE_URL}/api/admin/upload`, {
    method: 'POST',
    body: formData,
  }).then(async (response) => {
    if (!response.ok) {
      let detail = `Upload failed with status ${response.status}`
      try {
        const errorBody = await response.json()
        if (typeof errorBody?.detail === 'string') {
          detail = errorBody.detail
        }
      } catch {
        // Keep default.
      }
      throw new Error(detail)
    }
    return response.json()
  })
}

export function saveUploadedRater(payload) {
  return request('/api/admin/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
