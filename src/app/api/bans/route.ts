export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://sirplease.vercel.app/api/bans", {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (!res.ok) {
      return new Response("Error fetching bans", { status: 500 });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Bans API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
