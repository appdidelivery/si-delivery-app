import { auth } from '../services/firebase'; // Verifique se este é o caminho correto do seu firebase.js

// =========================================================================
// 🛡️ MOTOR DE FETCH AUTENTICADO (BLINDAGEM A2)
// =========================================================================
export const authenticatedFetch = async (url, options = {}) => {
    // 1. Pega o token do usuário logado no momento da requisição
    let token = '';
    if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
    }

    // 2. Mescla os cabeçalhos originais (ex: Content-Type) com o nosso Token
    const authHeaders = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    // 3. Executa o fetch nativo, mas agora com o crachá
    return fetch(url, { ...options, headers: authHeaders });
};