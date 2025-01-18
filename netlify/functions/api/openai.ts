import { Handler } from '@netlify/functions';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { messages } = body;

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('OpenAI Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenAI API Error' }),
    };
  }
}; 