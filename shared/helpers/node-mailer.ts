import httpStatus from 'http-status';
import nodemailer, { Transporter } from 'nodemailer';
import config from '../config/env-config';
import createLoggerInstance from '../utils/logger';
import ApiError from '../utils/api-error';
const logger = createLoggerInstance(config);

const transport: Transporter = nodemailer.createTransport(config.email.smtp);

if (config.env !== 'test') {
	transport
		.verify()
		.then(() => logger.info('Connected to email server.'))
		.catch(() =>
			logger.warn(
				'Unable to connect to email server. Make sure you have configured the SMTP options in .env',
			),
		);
}

interface EmailOptions {
	emailTo: string;
	subject: string;
	text?: string;
	html?: string;
}

// Send Mail
const sendEmail = async (
	{ emailTo, subject, text, html }: EmailOptions,
	retries = 3, // Number of retry attempts
): Promise<void> => {
	const msg = { from: config.email.from, to: emailTo, subject, text, html };
	console.log('Attempting to send email:', msg);

	let attempt = 0;
	while (attempt < retries) {
		try {
			attempt++;
			await transport.sendMail(msg);
			console.log('Email sent successfully!');
			return; // Exit the function if email is sent successfully
		} catch (err) {
			if (err instanceof Error) {
				if (attempt === retries) {
					// Throw error if all retry attempts fail
					throw new ApiError(
						httpStatus.FORBIDDEN,
						'Failed to send email after multiple attempts.',
					);
				}
			}

			// Add a delay before retrying (e.g., 1 second)
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
};

const mailHtmlTemplate = async (
	heading: string,
	message: string,
): Promise<string> => {
	return `
      <div style="font-family: Arial, sans-serif; background-color:rgb(255, 255, 255); padding: 20px; margin: 0; width: 100%; box-sizing: border-box;">
        <table style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <thead>
            <tr>
              <th style="background-color:rgb(243, 243, 243); padding: 20px; text-align: center;">
                <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Logo" style="max-width: 100px;">
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 20px; text-align: center; color: #333333;">
                <h2 style="margin: 0; font-size: 1.5em; font-weight: 600;">${heading}</h2>
                <p style="font-size: 1em; color: #777777; margin: 20px 0;">
                ${message}
                </p>              
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
};

export { sendEmail, mailHtmlTemplate };
