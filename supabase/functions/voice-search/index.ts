import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = "claude-haiku-4-5-20251001";

const PARSE_TOOL = {
  name: "parse_voice_query",
  description:
    "Parse a traveler's spoken search query into structured search intent for a Rwanda/East Africa tourism marketplace.",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["experience", "homestay", "attraction", "all"],
        description:
          "What kind of listing the traveler is after. 'experience' = guided activities/tours/classes. 'homestay' = a place to stay with a local family. 'attraction' = museums, parks, monuments, standalone sights. 'all' if unclear or the query spans more than one type.",
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description:
          "3-8 concrete search terms capturing the core subject and vibe of the request (e.g. activities, themes, animals, locations named). Include your own understanding of synonyms/related concepts the traveler likely means, not just literal words from the transcript.",
      },
      priceMax: { type: "number", description: "Maximum price in USD per person/night the traveler mentioned or implied (e.g. 'cheap', 'budget' implies a low ceiling like 40). Omit if no price constraint." },
      priceMin: { type: "number", description: "Minimum price in USD, only if the traveler asked for something upscale/premium/luxury. Omit otherwise." },
      durationHint: {
        type: "string",
        enum: ["short", "half_day", "full_day", "multi_day"],
        description: "How long the traveler wants the activity to be, if mentioned or implied. Omit if not mentioned.",
      },
      groupSize: { type: "number", description: "Number of people the traveler mentioned (e.g. 'for two of us', 'a family of four'). Omit if not mentioned." },
      locationHint: { type: "string", description: "A specific place name mentioned (city, lake, park, region in Rwanda/East Africa). Omit if not mentioned." },
      clarifyingQuestion: {
        type: ["string", "null"],
        description:
          "If the query is too vague to search meaningfully (e.g. just 'something fun', 'show me stuff'), a short, warm, specific follow-up question to ask the traveler. Otherwise null.",
      },
    },
    required: ["type", "keywords", "clarifyingQuestion"],
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: transcript" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Voice understanding is not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system:
          "You parse spoken search queries for Tahura Africa, a tourism marketplace covering Rwanda and East Africa (experiences, homestays, attractions). Always call parse_voice_query with your best structured interpretation, even for short or casual phrasing.",
        messages: [{ role: "user", content: transcript }],
        tools: [PARSE_TOOL],
        tool_choice: { type: "tool", name: "parse_voice_query" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${res.status} - ${errBody}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const toolUse = (data.content || []).find((b: any) => b.type === "tool_use" && b.name === "parse_voice_query");

    if (!toolUse) {
      return new Response(
        JSON.stringify({ error: "No structured intent returned" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ intent: toolUse.input }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
