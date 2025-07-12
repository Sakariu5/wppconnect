/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */
import { OpenAI } from 'openai';

const apiKey =
  process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OpenAI API key not found in environment variables');
}

const openai = new OpenAI({ apiKey });
export async function getGPTReply(message: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de WhatsApp para leads y clientes.',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return completion.choices[0].message?.content?.trim() || 'No response.';
  } catch (error: any) {
    console.error('Error calling OpenAI:', error);
    return 'Lo siento, hubo un error al procesar tu mensaje.';
  }
}
