import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
});

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔒 Reset Password VehiTrack - Kode OTP Anda',
    html: `
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
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Reset Password</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <!-- Welcome Text -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1f2937; margin: 0; font-size: 24px; font-weight: 600;">Verifikasi OTP</h2>
                <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px; line-height: 1.5;">
                  Gunakan kode OTP di bawah ini untuk melanjutkan proses reset password akun Anda
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
                  <li>Jika Anda tidak meminta reset password, abaikan email ini</li>
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
    `,
  };

  return transporter.sendMail(mailOptions);
}; 