import { Handler } from '@netlify/functions';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

const connection = new Connection('https://api.mainnet-beta.solana.com');

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { address } = event.queryStringParameters || {};
    if (!address) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Address is required' }),
      };
    }

    const pubkey = new PublicKey(address);
    const account = await getAccount(connection, pubkey);

    return {
      statusCode: 200,
      body: JSON.stringify(account),
    };
  } catch (error) {
    console.error('Solana Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Solana API Error' }),
    };
  }
}; 