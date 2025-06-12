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
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
        <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0; font-size: 28px; font-weight: 600;">🚗 VehiTrack</h1>
            <h2 style="color: #333; margin: 10px 0 0 0; font-size: 24px; font-weight: 600;">🔐 Reset Password</h2>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">Kode verifikasi untuk reset password Anda</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 25px; border-radius: 10px; text-align: center; margin: 30px 0;">
            <p style="color: white; margin: 0 0 10px 0; font-size: 14px; font-weight: 500;">KODE OTP ANDA</p>
            <h1 style="color: white; font-size: 36px; margin: 0; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Penting:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; color: #856404; font-size: 14px; padding-left: 20px;">
              <li>Kode ini akan kedaluwarsa dalam <strong>10 menit</strong></li>
              <li>Jangan bagikan kode ini kepada siapa pun</li>
              <li>Jika Anda tidak meminta reset password, abaikan email ini</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Email ini dikirim secara otomatis dari VehiTrack, mohon jangan membalas email ini.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}; 