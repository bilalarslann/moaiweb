import { Context } from '@netlify/edge-functions';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

const connection = new Connection('https://api.mainnet-beta.solana.com');

export default async (request: Request, context: Context) => {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');
    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pubkey = new PublicKey(address);
    const account = await getAccount(connection, pubkey);

    return new Response(JSON.stringify(account), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Solana Error:', error);
    return new Response(JSON.stringify({ error: 'Solana API Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}; 