import mysql from 'mysql2/promise';

export default async function handler(req, res) {
    // 跨域 CORS 安全設定（讓你的前端可以順利打進來）
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

    const { name, email, phone } = req.body;

    // 後端嚴格校驗防禦，防止空資料或惡意刷單
    if (!name || !email || !phone) {
        return res.status(400).json({ error: '所有尊榮欄位皆為必填項目，請檢查填寫完整性。' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    let connection;
    try {
        // 核心：連線至你剛剛申請好的 TiDB Cloud 雲端 MySQL
        connection = await mysql.createConnection(process.env.DATABASE_URL);

        // 執行 SQL 插入指令，將新會員檔案永久存入你的 test 資料庫中
        await connection.execute(
            'INSERT INTO users (name, email, phone) VALUES (?, ?, ?)',
            [cleanName, cleanEmail, cleanPhone]
        );

        // 回傳成功狀態給前端網頁
        return res.status(200).json({ 
            success: true, 
            message: '尊榮席位註冊成功，檔案已同步寫入 MySQL 全球資料庫。' 
        });

    } catch (error) {
        console.error('MySQL 寫入錯誤分析:', error);
        
        // 捕捉 MySQL 唯一的信箱重複衝突錯誤 (Error Code 'ER_DUP_ENTRY')
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({ error: '此信箱已被其他洗鍊靈魂註冊，請更換信箱。' });
        }
        
        return res.status(500).json({ error: '雲端資料庫寫入失敗，請聯繫品牌工程團隊。' });
    } finally {
        if (connection) await connection.end(); // 💡 確保不論成功失敗，都關閉連線釋放免費資源
    }
}