import { NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { query, language } = await req.json();

    // Scrape news from CryptoNews
    const response = await axios.get('https://cryptonews.com/');
    const dom = new JSDOM(response.data);
    const articles = dom.window.document.querySelectorAll('article.mb-30');
    
    let newsItems = Array.from(articles).map(article => {
      const titleElement = article.querySelector('a');
      const title = titleElement?.textContent?.trim() || '';
      const link = titleElement?.href || '';
      return { title, link };
    }).slice(0, 5); // Get only first 5 news items

    // Translate and format news based on language
    const prompt = language === 'tr' 
      ? `Aşağıdaki kripto haberlerini Türkçe'ye çevir ve özetle. Her haber için başlığı ve kısa bir özet yaz. Teknik terimleri ve kripto para birimlerinin isimlerini olduğu gibi bırak.

Haberler:
${newsItems.map(item => `${item.title}\n${item.link}`).join('\n\n')}

Çeviri ve özet formatı:
📰 [Türkçe Başlık]
[Türkçe özet - 1-2 cümle]
🔗 [Link]`
      : `Summarize the following crypto news in English. For each news item, write the title and a brief summary. Keep technical terms and cryptocurrency names unchanged.

News:
${newsItems.map(item => `${item.title}\n${item.link}`).join('\n\n')}

Summary format:
📰 [Title]
[Summary in 1-2 sentences]
🔗 [Link]`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: language === 'tr'
            ? "Sen profesyonel bir kripto haber editörüsün. Haberleri Türkçe'ye çevirip özetliyorsun."
            : "You are a professional crypto news editor. You summarize news in English."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4-turbo-preview",
    });

    return NextResponse.json({ content: completion.choices[0]?.message?.content || 'No news found.' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
} 