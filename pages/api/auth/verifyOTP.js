// pages/api/auth/verifyOTP.js - Verify OTP for both device verification and reset password
import redisClient from "../../../lib/redis";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed", success: false });
  }

  const { email, userId, otp, type = "device" } = req.body; // type: "device" or "reset_password"

  // Debug logging
  console.log("🔍 Verify OTP Request:", {
    email,
    userId,
    otp,
    type,
    bodyReceived: req.body
  });

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  // For device verification, userId is required
  if (type === "device" && !userId) {
    return res.status(400).json({
      success: false,
      message: "UserId is required for device verification",
    });
  }

  try {
    let otpKey;
    let storedData;

    if (type === "reset_password") {
      // For reset password
      otpKey = `reset_password_otp:${email}`;
      console.log("🔑 Reset Password OTP Key:", otpKey);
      
      const storedOTPData = await redisClient.get(otpKey);
      console.log("📦 Stored OTP Data:", storedOTPData);
      
      if (!storedOTPData) {
        console.log("❌ No OTP found in Redis for key:", otpKey);
        return res.status(400).json({
          success: false,
          message: "OTP expired atau tidak valid",
        });
      }

      // Parse stored data
      try {
        storedData = typeof storedOTPData === 'string' 
          ? JSON.parse(storedOTPData) 
          : storedOTPData;
      } catch (parseError) {
        console.error("❌ Error parsing stored OTP data:", parseError);
        return res.status(500).json({
          success: false,
          message: "Error processing OTP data",
        });
      }

      // Convert both to string for comparison
      const storedOTPString = String(storedData.otp);
      const receivedOTPString = String(otp);
      
      console.log("🔐 Comparing OTPs:", {
        stored: storedData.otp,
        storedType: typeof storedData.otp,
        received: otp,
        receivedType: typeof otp,
        storedString: storedOTPString,
        receivedString: receivedOTPString,
        match: storedOTPString === receivedOTPString
      });

      if (storedOTPString !== receivedOTPString) {
        return res.status(400).json({
          success: false,
          message: "OTP tidak valid",
        });
      }

      // OTP valid, hapus dari Redis
      await redisClient.del(otpKey);
      console.log("🗑️ Deleted OTP from Redis");

      // Reset attempt counter
      const attemptKey = `reset_password_attempts:${email}`;
      await redisClient.del(attemptKey);

      // Generate temporary token for password reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenKey = `reset_token:${resetToken}`;
      
      // Store reset token with user info (valid for 15 minutes)
      await redisClient.setex(resetTokenKey, 900, JSON.stringify({
        userId: storedData.userId,
        email: email
      }));

      console.log("✅ Reset password OTP verified successfully");

      return res.status(200).json({
        success: true,
        message: "OTP berhasil diverifikasi",
        resetToken: resetToken, // Client will use this to reset password
      });

    } else {
      // For device verification
      otpKey = `otp:${userId}:${email}`;
      console.log("🔑 Device Verification OTP Key:", otpKey);
      
      const storedOTP = await redisClient.get(otpKey);
      console.log("📦 Stored OTP:", storedOTP);

      if (!storedOTP) {
        console.log("❌ No OTP found in Redis for key:", otpKey);
        return res.status(400).json({
          success: false,
          message: "OTP expired atau tidak valid",
        });
      }

      // Convert both to string for comparison
      const storedOTPString = String(storedOTP);
      const receivedOTPString = String(otp);
      
      console.log("🔐 Comparing OTPs:", {
        stored: storedOTP,
        storedType: typeof storedOTP,
        received: otp,
        receivedType: typeof otp,
        storedString: storedOTPString,
        receivedString: receivedOTPString,
        match: storedOTPString === receivedOTPString
      });

      if (storedOTPString !== receivedOTPString) {
        return res.status(400).json({
          success: false,
          message: "OTP tidak valid",
        });
      }

      // OTP valid, hapus dari Redis
      await redisClient.del(otpKey);
      console.log("🗑️ Deleted OTP from Redis");

      // Reset attempt counter
      const attemptKey = `otp_attempts:${userId}`;
      await redisClient.del(attemptKey);

      console.log("✅ Device OTP verified successfully");

      return res.status(200).json({
        success: true,
        message: "OTP berhasil diverifikasi",
      });
    }

  } catch (error) {
    console.error("❌ OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memverifikasi OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}