import directusConfig from '../../../lib/directusConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Cek apakah email terdaftar
    const checkResponse = await fetch(
      `${directusConfig.endpoints.users}?filter[email][_eq]=${encodeURIComponent(email)}`,
      {
        headers: directusConfig.headers,
      }
    );

    const checkResult = await checkResponse.json();
    
    if (!checkResult.data || checkResult.data.length === 0) {
      return res.status(404).json({ error: 'Email tidak terdaftar' });
    }

    // Kirim request reset password ke endpoint Directus
    const response = await fetch(`${directusConfig.baseURL}/auth/password/request`, {
      method: 'POST',
      headers: directusConfig.headers,
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Gagal mengirim email reset password' });
    }

    return res.status(200).json({ success: true, message: 'Link reset password telah dikirim ke email Anda.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 