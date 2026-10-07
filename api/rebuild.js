// Vercel function: reads a product photo with Claude and returns flat panel artwork as JSON.
// Needs ANTHROPIC_API_KEY in the Vercel project's environment variables.
import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 120 };

const SCHEMA = {
  type: "object",
  properties: {
    panels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          background: { type: "string" },
          elements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["rect", "text"] },
                x: { type: "number" },
                y: { type: "number" },
                w: { type: "number" },
                h: { type: "number" },
                color: { type: "string" },
                text: { type: "string" },
                rotation: { type: "integer", enum: [0, 90, -90] },
              },
              required: ["kind", "x", "y", "w", "h", "color", "text", "rotation"],
              additionalProperties: false,
            },
          },
        },
        required: ["label", "background", "elements"],
        additionalProperties: false,
      },
    },
  },
  required: ["panels"],
  additionalProperties: false,
};

const prompt = (wmm, hmm) => `You are reconstructing flat print artwork from a photo of a product, for example a recycling bin with printed front panels.
Find each distinct printed panel visible in the photo, ordered left to right. For each panel, reconstruct the flat 2D artwork as if it were printed on a ${wmm} mm wide by ${hmm} mm tall rectangle. Remove perspective, lighting, reflections and shadows, and use the intended flat print colours as hex (a black panel is near #231f20, white is #ffffff).
Describe each panel as a background colour plus elements:
- kind "rect": a solid coloured rectangle (bars, colour blocks). text is "".
- kind "text": one element per line of text, with the exact text as printed (keep its case). The box is tight around the letters. rotation is 0 for normal horizontal text, 90 if the line reads top-to-bottom (letter tops face right), -90 if it reads bottom-to-top.
x, y, w, h are fractions from 0 to 1 of the panel's width and height, origin at the top-left, giving the element's bounding box on the flat panel. Measure carefully from the photo so proportions match.`;

const client = new Anthropic();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method", message: "Use POST." });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "no_key", message: "ANTHROPIC_API_KEY is not set." });

  const { image, media_type, width_mm, height_mm } = req.body || {};
  const types = ["image/jpeg", "image/png", "image/webp"];
  if (typeof image !== "string" || !image || !types.includes(media_type)) {
    return res.status(400).json({ error: "bad_request", message: "Send a JPEG, PNG or WebP photo." });
  }
  const wmm = Math.min(5000, Math.max(10, Number(width_mm) || 370));
  const hmm = Math.min(5000, Math.max(10, Number(height_mm) || 770));

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data: image } },
            { type: "text", text: prompt(wmm, hmm) },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "refused", message: "The AI declined to read this photo." });
    }
    if (response.stop_reason === "max_tokens") {
      return res.status(502).json({ error: "truncated", message: "The photo has too much detail to rebuild in one go." });
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return res.status(200).json(JSON.parse(text));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "bad_key", message: "The ANTHROPIC_API_KEY in Vercel is not valid." });
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "rate_limited", message: "Too many requests just now. Wait a moment, then try again." });
    if (e instanceof Anthropic.BadRequestError) return res.status(400).json({ error: "bad_request", message: "The AI could not accept this photo. Try a smaller JPEG." });
    if (e instanceof Anthropic.APIStatusError) return res.status(502).json({ error: "upstream", message: "The AI service had an error. Try again shortly." });
    if (e instanceof Anthropic.APIConnectionError) return res.status(502).json({ error: "network", message: "Could not reach the AI service. Try again shortly." });
    if (e instanceof SyntaxError) return res.status(502).json({ error: "bad_output", message: "The AI reply could not be read. Try again." });
    console.error(e);
    return res.status(500).json({ error: "server", message: "Something went wrong on the server." });
  }
}
