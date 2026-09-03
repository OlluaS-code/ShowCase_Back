import nodemailer from "nodemailer";
import { config } from "../../utils/settings/config";

export interface MailPayload {
  to: string;
  subject: string;
  template: string;
}

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_SECURE,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
  });

  public static async sendWelcomeEmail(
    email: string,
    name: string,
  ): Promise<void> {
    const mailOptions = {
      from: `"App Notification" <${config.EMAIL_USER}>`,
      to: email,
      subject: "Bem-vindo ao nosso App!",
      text: `Olá ${name}, seu registro foi realizado com sucesso!`,
      html: `<h1>Bem-vindo, ${name}!</h1><p>Seu registro foi concluído com sucesso.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Erro ao enviar e-mail de boas-vindas:", error);
    }
  }

  public static async sendNotificationEmail(
    to: string,
    subject: string,
    message: string,
    actionLink?: string,
    actionText: string = "Ver Publicação"
  ): Promise<void> {
    const actionButtonHtml = actionLink
      ? `<br/><a href="${actionLink}" style="display: inline-block; padding: 10px 20px; background-color: #2549D3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">${actionText}</a>`
      : "";

    const mailOptions = {
      from: `"Notificação de Sistema" <${config.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: message,
      html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #2549D3;">Notificação Importante</h2>
              <p style="font-size: 16px; line-height: 1.5;">${message}</p>
              ${actionButtonHtml}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <small style="color: #888;">Você recebeu esta mensagem pois está cadastrado em nosso sistema.</small>
            </div>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`E-mail enviado: ${info.messageId}`);
    } catch (error) {
      console.error(`Falha no envio para ${to}:`, error);
      throw new Error("Falha ao disparar e-mail de notificação.");
    }
  }
}
