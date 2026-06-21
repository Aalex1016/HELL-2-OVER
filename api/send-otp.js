import nodemailer from 'nodemailer';
import crypto from 'crypto';

// 從環境變數讀取金鑰，本地開發時會讀取你的 .env 檔案
const ENCRYPTION_KEY = process.env.H2O_SECRET_KEY || 'hell2over_luxury_secret_key_32bytes'; 
const IV_LENGTH = 16;

// 加密安全 Token 函式（將信箱、驗證碼、過期時間打包加密送回前端）
function generateEncryptedToken(email, otp, expiresAt) {
    const data = JSON.stringify({ email, otp, expiresAt });
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export default async function handler(req, res) {
    // 跨域 CORS 設定
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

    const { email } = req.body;
    if (!email) { return res.status(400).json({ error: 'Email is required' }); }

    // 讀取你的免費 Gmail 帳號與 16 碼應用程式密碼
   // ======= 強行塞入你的資訊進行測試 =======
    const gmailUser = "al7904419@gmail.com";
    const gmailAppPassword = "dzrf ewsw cuqb qbug"; // 記得中間不要留空格，如 "abcdefghijklmnop"

    if (!gmailUser || !gmailAppPassword) {
        return res.status(500).json({ error: '伺服器配置錯誤：缺少 GMAIL 環境變數。' });
    }

    // 建立 Gmail 發信通道
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailAppPassword
        }
    });

    // 隨機生成 6 位數驗證碼，並設定 5 分鐘後過期
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; 

    try {
        // 發送高奢質感品牌 HTML 驗證信
        await transporter.sendMail({
            from: `"HELL 2 OVER" <${gmailUser}>`, 
            to: email,
            subject: '【HELL 2 OVER】ACCESS VERIFICATION',
            html: `
                <div style="background:#0d0d0d; color:#f5f5f5; padding:50px 30px; font-family:sans-serif; text-align:center; max-width:500px; margin:0 auto; border:1px solid #dfb76c;">
                    <h2 style="color:#dfb76c; letter-spacing:8px; font-size:20px; font-weight:900; margin-bottom:40px;">HELL 2 OVER</h2>
                    <p style="font-size:12px; letter-spacing:2px; color:rgba(255,255,255,0.6); line-height:2;">您正在申請開通或重新登錄洗鍊席位。</p>
                    <p style="font-size:12px; letter-spacing:2px; color:rgba(255,255,255,0.6); margin-bottom:40px;">請在網頁端輸入下方 6 位數動態認證碼：</p>
                    <div style="background:rgba(223,183,108,0.05); border:1px solid rgba(223,183,108,0.3); padding:20px; font-size:32px; font-family:monospace; color:#dfb76c; letter-spacing:10px; text-indent:10px; font-weight:200; margin-bottom:40px;">
                        ${otp}
                    </div>
                    <p style="font-size:10px; color:rgba(255,255,255,0.3); letter-spacing:1px;">此驗證碼將於 5 分鐘後失效。請勿將此代碼透露給任何人。</p>
                    <hr style="border:none; border-top:1px solid rgba(223,183,108,0.1); margin:40px 0;">
                    <p style="font-size:9px; color:rgba(255,255,255,0.3); letter-spacing:1px;">© 2026 HELL 2 OVER. Beyond hydration.</p>
                </div>
            `
        });

        // 產生加密安全 Token
        const securityToken = generateEncryptedToken(email, otp, expiresAt);
        
        // 回傳成功訊號與 Token 給前端
        return res.status(200).json({ success: true, token: securityToken });

    } catch (error) {
        return res.status(500).json({ error: 'Gmail 發信伺服器異常，請檢查環境變數設定。' });
    }
}