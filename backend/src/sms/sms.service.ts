import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class SmsService {
  private baseUrl = 'https://api.semaphore.co/api/v4/messages';

  private apiKey = process.env.SEMAPHORE_API_KEY;

  constructor() {
    console.log('Semaphore API Key:', this.apiKey);
    if (!this.apiKey) {
      throw new Error('SEMAPHORE_API_KEY is not set in .env');
    }
  }

  async sendSMS(to: string, message: string) {
    if (!to || !message) {
      throw new BadRequestException('Recipient and message are required');
    }

    const payload = {
      apikey: this.apiKey,
      number: to,
      message,
      // ❌ REMOVE sendername — causes “Failed” status
    };

    console.log('Sending Semaphore SMS payload:', payload);

    let res;
    let data;

    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      data = await res.json();
    } catch (err) {
      console.error('Fetch error:', err);
      throw new InternalServerErrorException('Failed to reach Semaphore API');
    }

    console.log('Semaphore response status:', res.status);
    console.log('Semaphore response body:', data);

    // Handle error format returned by Semaphore
    if (Array.isArray(data) && data[0]?.message_id === undefined) {
      throw new BadRequestException(data[0]?.message || 'Failed to send SMS');
    }

    return data;
  }
}
