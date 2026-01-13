import { NextRequest, NextResponse } from "next/server";
import { Client } from "@gradio/client";

const STYLE_PREFIX = `Coloring book page illustration, black and white line art, clean bold outlines, no shading, no gradients, no color fill, no grayscale, simple design suitable for children to color in, white background, thick black lines, cartoon style, cute and friendly, `;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Please describe what you'd like to color!" },
        { status: 400 }
      );
    }

    const sanitizedPrompt = prompt.trim().slice(0, 200);
    const fullPrompt = `${STYLE_PREFIX}${sanitizedPrompt}`;

    console.log(`[Inklings] Generating: ${sanitizedPrompt.slice(0, 50)}...`);

    // Connect to public Gradio Space - no auth needed
    const app = await Client.connect("Tongyi-MAI/Z-Image-Turbo");
    
    const result = await app.predict("/Z_Image_Turbo_generate", {
      prompt: fullPrompt,
      resolution: "1024x1024 ( 1:1 )",
      steps: 8,
      random_seed: true,
    });

    console.log("[Inklings] Raw result:", JSON.stringify(result.data).slice(0, 500));

    // Extract image URL from result
    // Response format: [gallery_images_array, seed_str, seed_int]
    const data = result.data as unknown[];
    const gallery = data[0];
    
    let imageUrl: string | null = null;
    
    if (Array.isArray(gallery) && gallery.length > 0) {
      const firstImage = gallery[0];
      if (typeof firstImage === "object" && firstImage !== null) {
        // Could be {image: {url: string}} or {url: string} or just string
        const img = firstImage as Record<string, unknown>;
        if (img.image && typeof img.image === "object") {
          imageUrl = (img.image as Record<string, unknown>).url as string;
        } else if (img.url) {
          imageUrl = img.url as string;
        }
      } else if (typeof firstImage === "string") {
        imageUrl = firstImage;
      }
    }

    if (!imageUrl) {
      console.error("[Inklings] Could not extract image URL from:", JSON.stringify(data));
      throw new Error("No image returned from generator");
    }

    console.log(`[Inklings] Fetching image from: ${imageUrl.slice(0, 100)}...`);

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64}`,
      prompt: sanitizedPrompt,
    });
  } catch (err) {
    console.error("[Inklings] Generation error:", err);
    
    const msg = err instanceof Error ? err.message : String(err);
    
    if (msg.includes("rate limit") || msg.includes("429") || msg.includes("queue") || msg.includes("exceeded")) {
      return NextResponse.json(
        { error: "The coloring machine is busy! Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Oops! Something went wrong. Please try again!" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Inklings coloring page generator is ready!",
  });
}
