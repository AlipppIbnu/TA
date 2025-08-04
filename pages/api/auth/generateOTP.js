// pages/api/auth/generateOTP.js - Generate OTP for device verification
import redisClient from "../../../lib/redis";
import { sendDeviceVerificationOTP, verifyEmailTransporter } from "../../../lib/email";
import crypto from "crypto";

export default async function handler(req, res) {
  console.log("🚀 Generate OTP API called");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed", success: false });
  }

  const { email, userId } = req.body;
  console.log("📨 Request data:", { email, userId });

  if (!email || !userId) {
    return res
      .status(400)
      .json({ message: "Email and userId are required", success: false });
  }

  // Check environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ Email credentials missing");
    return res.status(500).json({
      success: false,
      message: "Email configuration missing",
    });
  }

  try {
    // Check if there's an existing OTP for this user (rate limiting)
    const otpKey = `otp:${userId}:${email}`;
    const existingOTP = await redisClient.get(otpKey);
    
    if (existingOTP) {
      const ttl = await redisClient.ttl(otpKey);
      if (ttl > 0) {
        return res.status(429).json({
          success: false,
          message: `Silakan tunggu ${ttl} detik sebelum meminta OTP baru`,
          retryAfter: ttl
        });
      }
    }

    // Check attempt rate limiting
    const attemptKey = `otp_attempts:${userId}`;
    const attempts = await redisClient.get(attemptKey) || 0;
    
    if (parseInt(attempts) >= 5) {
      return res.status(429).json({
        success: false,
        message: "Terlalu banyak percobaan. Silakan coba lagi dalam 1 jam",
        retryAfter: 3600
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log("🔢 Generated OTP:", otp);

    // Store OTP in Redis with 1 minute expiration
    const redisResult = await redisClient.setex(otpKey, 60, otp);
    console.log("💾 Redis storage result:", redisResult);

    // Update attempt count
    await redisClient.setex(attemptKey, 3600, parseInt(attempts) + 1); // 1 hour expiry

    // Verify email transporter
    console.log("🔍 Verifying email configuration...");
    await verifyEmailTransporter();
    console.log("✅ Email transporter verified successfully");

    // Send email with timeout
    console.log("📧 Sending email...");
    
    try {
      const emailResult = await sendDeviceVerificationOTP(email, otp);
      console.log("✅ Email sent successfully:", emailResult.messageId);

      return res.status(200).json({
        success: true,
        message: "OTP berhasil dikirim ke email Anda",
        messageId: emailResult.messageId,
      });
    } catch (emailError) {
      // Even if email fails, OTP is stored in Redis
      console.error("⚠️ Email sending failed:", emailError.message);
      
      // You might want to still return success since OTP is generated
      return res.status(200).json({
        success: true,
        message: "OTP telah dibuat. Silakan cek email Anda.",
        warning: "Pengiriman email mungkin tertunda"
      });
    }

  } catch (err) {
    console.error("❌ Error in generateOTP:", err);

    const message =
      err instanceof Error ? err.message : "Unknown error saat mengirim OTP";

    return res.status(500).json({
      success: false,
      message: `Gagal mengirim OTP: ${message}`,
    });
  }
}