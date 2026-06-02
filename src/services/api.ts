const BASE_URL = '/api';

const getCleanToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  // Membersihkan tanda kutip yang mungkin tersimpan secara tidak sengaja
  return token.replace(/^['"]+|['"]+$/g, '');
};

const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const token = getCleanToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...customHeaders,
  };
};

// ✅ SUPER SMART CHECK: Memastikan payload benar-benar bersih dari double-stringify
const prepareBody = (body: any) => {
  if (!body) return undefined;
  
  if (typeof body === 'string') {
    // Jika body adalah string yang dikelilingi tanda kutip (double stringified JSON)
    // Contoh: '"{\\"kode\\":\\"123\\"}"'
    if (body.startsWith('"') && body.endsWith('"')) {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed === 'string') {
          return parsed; // Kembalikan string JSON lapisan pertama
        }
      } catch(e) {}
    }
    return body; // Jika string biasa, biarkan
  }
  
  // Jika object, stringify secara normal
  return JSON.stringify(body);
};

const handleResponse = async (response: Response, endpoint: string) => {
  // Jika 401, jangan langsung lempar error yang merusak alur, biarkan UI menanganinya
  if (response.status === 401) {
    console.error("API: Sesi tidak sah atau kadaluarsa (401).");
  }

  // Mengambil response secara mentah dulu untuk menangkap pesan error spesifik dari Backend
  const text = await response.text();
  let data: any = {};
  
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }
  
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Terjadi kesalahan pada server (Status: ${response.status})`;
    
    // 🔥 LOGGING SPESIFIK: Ini akan mencetak alasan PASTI kenapa terjadi 400 Bad Request
    console.error(`❌ [API Error] ${endpoint} (${response.status}):`, errorMsg, data);
    
    throw new Error(errorMsg);
  }
  
  return data;
};

export const api = {
  get: async (endpoint: string, customHeaders?: HeadersInit) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(customHeaders),
    });
    return handleResponse(response, endpoint);
  },
  
  post: async (endpoint: string, body: any, customHeaders?: HeadersInit) => {
    const finalBody = prepareBody(body);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(customHeaders),
      body: finalBody,
    });
    return handleResponse(response, endpoint);
  },
  
  put: async (endpoint: string, body: any, customHeaders?: HeadersInit) => {
    const finalBody = prepareBody(body);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(customHeaders),
      body: finalBody,
    });
    return handleResponse(response, endpoint);
  },
  
  delete: async (endpoint: string, customHeaders?: HeadersInit) => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(customHeaders),
    });
    return handleResponse(response, endpoint);
  },
  
  patch: async (endpoint: string, body: any, customHeaders?: HeadersInit) => {
    const finalBody = prepareBody(body);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(customHeaders),
      body: finalBody,
    });
    return handleResponse(response, endpoint);
  }
};

// ============================================
// ✅ FUNGSI apiRequest UNTUK KOMPATIBILITAS DENGAN KODE LAMA
// ============================================
export async function apiRequest<T = any>(
  endpoint: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: any; headers?: HeadersInit }
): Promise<T> {
  const method = options?.method || 'GET';
  const body = options?.body;
  const headers = options?.headers;

  switch (method) {
    case 'GET':
      return api.get(endpoint, headers) as Promise<T>;
    
    case 'POST':
      return api.post(endpoint, body, headers) as Promise<T>;
    
    case 'PUT':
      return api.put(endpoint, body, headers) as Promise<T>;
    
    case 'PATCH':
      return api.patch(endpoint, body, headers) as Promise<T>;
    
    case 'DELETE':
      return api.delete(endpoint, headers) as Promise<T>;
    
    default:
      throw new Error(`Method ${method} tidak didukung`);
  }
}

export default api;