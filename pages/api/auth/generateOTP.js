// pages/api/auth/generateOTP.js
import { Redis } from "@upstash/redis";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

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
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log("🔢 Generated OTP:", otp);

    // Create OTP key with userId for security
    const otpKey = `otp:${userId}:${email}`;
    console.log("🔑 OTP Key:", otpKey);

    // Store OTP in Redis with 1 minute expiration (60 seconds)
    const redisResult = await redis.setex(otpKey, 60, otp);
    console.log("💾 Redis storage result:", redisResult);

    // Configure Nodemailer
    console.log("📬 Configuring email transporter...");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify transporter configuration
    console.log("🔍 Verifying email configuration...");
    await transporter.verify();
    console.log("✅ Email transporter verified successfully");

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%); padding: 20px;">
          <!-- Main Card -->
          <div style="background: white; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700;">VehiTrack</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Verifikasi Perangkat Baru</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <!-- Welcome Text -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: 600;">Verifikasi OTP</h2>
                <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px; line-height: 1.5;">
                  Gunakan kode OTP di bawah ini untuk memverifikasi perangkat baru Anda
                </p>
              </div>

              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 16px; text-align: center; margin: 30px 0;">
                <p style="color: rgba(255,255,255,0.9); margin: 0 0 10px 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">KODE OTP ANDA</p>
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 12px; margin: 0 auto; display: inline-block;">
                  <h1 style="color: white; font-size: 36px; margin: 0; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</h1>
                </div>
              </div>

              <!-- Warning Box -->
              <div style="background: #fff7ed; border: 1px solid #fdba74; border-radius: 12px; padding: 20px; margin-top: 30px;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="color: #c2410c; font-weight: 600; font-size: 16px;">⚠️ Penting:</span>
                </div>
                <ul style="margin: 0; padding-left: 20px; color: #9a3412; font-size: 14px; line-height: 1.5;">
                  <li style="margin-bottom: 8px;">Kode ini akan kedaluwarsa dalam <strong>1 menit</strong></li>
                  <li style="margin-bottom: 8px;">Jangan bagikan kode ini kepada siapa pun</li>
                  <li>Jika Anda tidak meminta verifikasi perangkat baru, abaikan email ini</li>
                </ul>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Email ini dikirim secara otomatis dari VehiTrack, mohon jangan membalas email ini.
                </p>
              </div>
            </div>
          </div>

          <!-- Additional Info -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2024 VehiTrack. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("📧 Sending email...");

    // Send OTP email
    const emailResult = await transporter.sendMail({
      from: `VehiTrack <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verifikasi Perangkat Baru - VehiTrack",
      html: emailHtml,
      text: `Kode OTP Anda adalah: ${otp}. Kode ini akan kedaluwarsa dalam 1 menit.`,
    });

    console.log("✅ Email sent successfully:", emailResult.messageId);

    return res.status(200).json({
      success: true,
      message: "OTP berhasil dikirim ke email Anda",
      messageId: emailResult.messageId,
    });
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