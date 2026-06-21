import crypto from 'crypto';

// 必須與 send-otp.js 使用完全相同的金鑰
const ENCRYPTION_KEY = process.env.H2O_SECRET_KEY || 'hell2over_luxury_secret_key_32bytes';

// 解密函式：還原 Token 內的信箱、驗證碼與過期時間
function decryptToken(token) {
    const textParts = token.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

export default async function handler(req, res) {
    // 跨域 CORS 設定
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

    const { email, otp, token } = req.body;
    if (!email || !otp || !token) { return res.status(400).json({ error: 'Missing required parameters' }); }

    try {
        // 解密前端送回的 Token
        const decrypted = decryptToken(token);

        // 安全校驗 1：防止惡意竄改比對的信箱
        if (decrypted.email !== email.trim().toLowerCase()) {
            return res.status(400).json({ error: 'Security alert: Email mismatch.' });
        }

        // 安全校驗 2：檢查驗證碼是否超過 5 分鐘過期
        if (Date.now() > decrypted.expiresAt) {
            return res.status(400).json({ error: 'The code has expired. Please resend.' });
        }

        // 安全校驗 3：比對使用者輸入的驗證碼是否正確
        if (decrypted.otp !== otp.trim()) {
            return res.status(400).json({ error: 'Incorrect verification code.' });
        }

        // 全數通過！
        return res.status(200).json({ success: true });

    } catch (error) {
        return res.status(400).json({ error: 'Invalid or corrupted security token.' });
    }
}