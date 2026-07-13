import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_Key!,
});

export async function POST(req: Request) {
    console.log("inside req")
  const { input } = await req.json();

  const response = await client.responses.create({
    model: "gpt-5.4-nano",
    input,
  });

  return Response.json({ text: response.output_text });
}