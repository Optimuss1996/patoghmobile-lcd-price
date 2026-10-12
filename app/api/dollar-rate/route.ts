export const revalidate = 10800; // Cache for 180 minutes

export async function GET() {
  try {
    const apiKey = process.env.SERVIX_API_KEY ?? process.env.API_KEY;

    if (!apiKey) {
      return Response.json({
        rate: null,
        timestamp: Date.now(),
        unavailable: true,
      });
    }

    const response = await fetch("https://servix.cc/api/v1/assets/USD_RLS", {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
      },
      next: {
        revalidate: 10800,
      },
    });

    if (!response.ok) {
      console.error(" Dollar provider response:", response.status);
      return Response.json({
        rate: null,
        timestamp: Date.now(),
        unavailable: true,
      });
    }

    const data = await response.json();
    const rawValue = Number(data?.value ?? data?.data?.value ?? data?.rate);

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      console.error(" Dollar API returned an invalid rate shape");
      return Response.json({
        rate: null,
        timestamp: Date.now(),
        unavailable: true,
      });
    }

    // Convert IRR to Toman by dividing by 10
    const rateInToman = Math.round(rawValue / 10);

    return Response.json({
      rate: rateInToman,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[v0] Dollar API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
