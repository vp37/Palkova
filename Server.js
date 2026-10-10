// Minimal Razorpay backend. Run: npm i express cors razorpay dotenv && node server.js
// .env: RAZORPAY_KEY_ID=rzp_test_xxx  RAZORPAY_KEY_SECRET=xxxx  ALLOWED_ORIGIN=https://yourwebsite.com
require("dotenv").config();
const express=require("express"),cors=require("cors"),crypto=require("crypto"),Razorpay=require("razorpay");
const app=express();app.use(express.json());app.use(cors({origin:process.env.ALLOWED_ORIGIN||"*"}));
const rz=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
const PRICES={p250:150,p500:290,p1000:560};
const COUPONS={PALKOVA10:{type:"pct",value:10},FIRST50:{type:"flat",value:50,min:500}};
// Price is recalculated here so customers cannot tamper with the amount.
app.post("/create-order",async(req,res)=>{
  try{
    const {cart={},coupon,customer={}}=req.body;
    let sub=0;for(const [id,q] of Object.entries(cart)){
      if(!PRICES[id]||!Number.isInteger(q)||q<0||q>100)return res.status(400).json({error:"Invalid cart"});sub+=PRICES[id]*q;}
    if(!sub)return res.status(400).json({error:"Empty cart"});
    const c=COUPONS[coupon];let disc=0;
    if(c&&(!c.min||sub>=c.min))disc=Math.min(sub,c.type==="pct"?Math.round(sub*c.value/100):c.value);
    const order=await rz.orders.create({amount:(sub-disc)*100,currency:"INR",receipt:"sp_"+Date.now(),
      notes:{name:customer.name,phone:customer.phone,address:customer.address||customer.addr}});
    res.json({id:order.id,amount:order.amount});
  }catch(e){console.error(e);res.status(500).json({error:"Could not create order"})}
});
app.post("/verify-payment",(req,res)=>{
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
  const sig=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
  res.json({ok:sig===razorpay_signature});
});
app.listen(process.env.PORT||3000,()=>console.log("Server running"));