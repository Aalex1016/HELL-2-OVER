// api/checkout.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // 嚴格限制只有 POST 請求可以觸發此 API (防範錯誤呼叫)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 從前端接收消費者選擇的組合與物流方式
        const { bundle, shippingMethod } = req.body;

        // 在後端建立商品資料庫，確保價格不會被前端竄改 (這點對於財務精準度至關重要)
        const products = {
            '1_CAN': { price: 4500, name: "DEMON'S TEAR - 1 CAN (試飲裝)" },
            '6_CANS': { price: 25000, name: "DEMON'S TEAR - 6 CANS (珍藏禮盒)" },
            '24_CANS': { price: 105000, name: "DEMON'S TEAR - 24 CANS (極致箱裝)" }
        };

        const selectedProduct = products[bundle];

        if (!selectedProduct) {
            return res.status(400).json({ error: '無效的商品組合' });
        }

        // 向 Stripe 請求建立一個專屬的結帳工作階段 (Checkout Session)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'twd',
                        product_data: { 
                            name: selectedProduct.name,
                            description: `物流方式: ${shippingMethod}`
                        },
                        // Stripe 的金額必須是最小單位，例如 TWD 45 元要寫成 4500 (乘上 100)
                        unit_amount: selectedProduct.price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            
            // 👇 新增功能：開啟收集收件地址 (限定台灣) 👇
            shipping_address_collection: {
                allowed_countries: ['TW'], 
            },
            
            // 👇 新增功能：開啟收集聯絡電話 👇
            phone_number_collection: {
                enabled: true,
            },

            // 結帳成功與取消後要導向的網址
            success_url: `${req.headers.origin}/index.html`,
            cancel_url: `${req.headers.origin}/product.html`,
        });

        // 將 Stripe 產生的結帳連結回傳給前端
        res.status(200).json({ url: session.url });
        
    } catch (err) {
        console.error('Stripe API 錯誤:', err);
        res.status(500).json({ error: '伺服器發生錯誤，無法建立結帳連結' });
    }
}