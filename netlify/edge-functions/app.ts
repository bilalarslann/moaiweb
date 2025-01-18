import { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // Get the pathname
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Forward the request to the Next.js app
  return context.next();
}; 