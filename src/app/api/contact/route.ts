import { NextRequest, NextResponse } from "next/server";
import { getUserWithPlan } from "@/lib/database/users";
import { getRateCount, insertSupportSubmission } from "@/lib/database/contact";
import nodemailer from "nodemailer";
const MAX_MESSAGE_LENGTH = 2_000;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserWithPlan();
    // 2. Parse and validate the inputs
    const { name, email, message } = await request.json();

    if (!user) {
      return NextResponse.json({ error: "not a valid user" }, { status: 401 });
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing name, email address, or message" },
        { status: 400 },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name is too long, must be less than 100 characters" },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email is not a valid address" },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH || message.length < 10) {
      return NextResponse.json(
        { error: "Message is too long or too short" },
        { status: 400 },
      );
    }

    const email_count = await getRateCount(user.user_id);

    if (email_count >= 3) {
      return NextResponse.json(
        { error: "You can only send 3 messages per day" },
        { status: 429 },
      );
    }
    // 4. Send the email via NodeMailer + Zoho SMTP - Create a transporter and send
    // From address must match the ZOHO_SMTP_USER - this part I don't really understand
    const transporter = nodemailer.createTransport({
      host: process.env.ZOHO_SMTP_HOST,
      port: Number(process.env.ZOHO_SMTP_PORT),
      secure: true, // true for port 465 (SSL)
      auth: {
        user: process.env.ZOHO_SMTP_USER,
        pass: process.env.ZOHO_SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Let Em Cook Contact" <${process.env.ZOHO_SMTP_USER}>`,
      to: "support@let-em-cook.io",
      subject: `Contact Form: Message from ${name}`,
      replyTo: email,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });
    await insertSupportSubmission(user.user_id, email, name, message);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = "Failed to send message";
    console.log(`Failed to send message: ${error}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
